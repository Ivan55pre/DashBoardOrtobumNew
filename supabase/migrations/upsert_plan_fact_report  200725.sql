-- Функция для атомарной загрузки/обновления отчета "План-факт".
-- Аналогична другим upsert-функциям, обрабатывает иерархию.
CREATE OR REPLACE FUNCTION public.upsert_plan_fact_report(
    p_organization_name TEXT,
    p_report_date DATE,
    p_report_items JSONB
)
RETURNS UUID -- Возвращаем ID созданного отчета для подтверждения
LANGUAGE plpgsql
-- Выполняется с правами владельца, чтобы обойти RLS для системной операции
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_report_id UUID;
    item JSONB;
    v_item_id UUID;
    v_parent_id UUID;
BEGIN
    -- Шаг 1: Найти или создать организацию по имени.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO v_organization_id;

    -- Шаг 2: Найти или создать метаданные отчета.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'plan_fact', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Шаг 3: Удалить старые данные для этого отчета.
    DELETE FROM public.plan_fact_reports_items WHERE report_id = v_report_id;

    -- Шаг 4: Вставить новые строки отчета, обрабатывая иерархию.
    CREATE TEMP TABLE temp_category_map (category_name TEXT PRIMARY KEY, item_id UUID NOT NULL) ON COMMIT DROP;

    -- Первый проход: вставляем все элементы с NULL в parent_id и заполняем карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        INSERT INTO public.plan_fact_reports_items (report_id, category_name, plan_amount, fact_amount, execution_percent, is_total_row, period_type, level, is_expandable)
        VALUES (v_report_id, item->>'category_name', (item->>'plan_amount')::DECIMAL, (item->>'fact_amount')::DECIMAL, (item->>'execution_percent')::DECIMAL, (item->>'is_total_row')::BOOLEAN, item->>'period_type', (item->>'level')::INTEGER, (item->>'is_expandable')::BOOLEAN)
        RETURNING id INTO v_item_id;

        INSERT INTO temp_category_map (category_name, item_id) VALUES (item->>'category_name', v_item_id);
    END LOOP;

    -- Второй проход: обновляем parent_id, используя карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        IF item->>'parent_category_name' IS NOT NULL AND item->>'parent_category_name' != '' THEN
            SELECT item_id INTO v_parent_id FROM temp_category_map WHERE category_name = item->>'parent_category_name';
            IF v_parent_id IS NOT NULL THEN
                UPDATE public.plan_fact_reports_items SET parent_id = v_parent_id WHERE report_id = v_report_id AND category_name = item->>'category_name';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;
