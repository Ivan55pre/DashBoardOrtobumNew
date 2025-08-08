-- Миграция для унификации использования is_total_row
-- Этот скрипт приводит структуру отчетов к единообразию,
-- добавляя флаг is_total_row в отчет по товарным запасам и обновляя связанные функции.
-- Скрипт разработан для безопасного повторного выполнения.

BEGIN;

-- Шаг 1: Добавление столбца is_total_row в таблицу inventory_turnover_report_items
-- Добавляем столбец, только если он еще не существует, чтобы избежать ошибок при повторном запуске.
ALTER TABLE public.inventory_turnover_report_items
ADD COLUMN IF NOT EXISTS is_total_row BOOLEAN DEFAULT FALSE;

-- Шаг 2: Обновление существующих данных для обратной совместимости
-- Проставляем флаг is_total_row = TRUE для итоговых строк, которые ранее определялись по level = 1.
-- Это разовое действие для миграции старых данных.
UPDATE public.inventory_turnover_report_items
SET is_total_row = TRUE
WHERE level = 1 AND is_total_row IS DISTINCT FROM TRUE;

-- Шаг 3: Установка значения по умолчанию для is_total_row в других таблицах
-- Это обеспечивает консистентность во всех таблицах отчетов.
ALTER TABLE public.debt_reports_items
ALTER COLUMN is_total_row SET DEFAULT FALSE;

ALTER TABLE public.plan_fact_reports_items
ALTER COLUMN is_total_row SET DEFAULT FALSE;

-- Шаг 4: Обновление функции upsert_inventory_turnover_report
-- Функция перезаписывается для корректной обработки нового столбца is_total_row при вставке данных.
-- Добавлена обработка отсутствующего ключа is_total_row в JSON для большей надежности.
CREATE OR REPLACE FUNCTION public.upsert_inventory_turnover_report(p_organization_name text, p_report_date date, p_report_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_organization_id uuid;
    v_report_id uuid;
    item jsonb;
    v_item_id uuid;
    v_parent_id uuid;
BEGIN
    INSERT INTO public.organizations (name) VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE SET name = excluded.name
    RETURNING id INTO v_organization_id;

    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'inventory_turnover', p_report_date, now())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_report_id;

    DELETE FROM public.inventory_turnover_report_items WHERE report_id = v_report_id;

    CREATE TEMP TABLE temp_category_map (category_name text PRIMARY KEY, item_id uuid NOT NULL) ON COMMIT DROP;

    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        INSERT INTO public.inventory_turnover_report_items (
            report_id, category_name, quantity_pairs, balance_rub, dynamics_start_month_rub,
            dynamics_start_month_percent, dynamics_start_year_rub, dynamics_start_year_percent,
            turnover_days, level, is_total_row
        ) VALUES (
            v_report_id,
            item->>'category_name',
            (item->>'quantity_pairs')::integer,
            (item->>'balance_rub')::decimal,
            (item->>'dynamics_start_month_rub')::decimal,
            (item->>'dynamics_start_month_percent')::decimal,
            (item->>'dynamics_start_year_rub')::decimal,
            (item->>'dynamics_start_year_percent')::decimal,
            (item->>'turnover_days')::integer,
            (item->>'level')::integer,
            COALESCE((item->>'is_total_row')::boolean, FALSE) -- ИЗМЕНЕНИЕ: Обработка нового поля
        ) RETURNING id INTO v_item_id;

        INSERT INTO temp_category_map (category_name, item_id) VALUES (item->>'category_name', v_item_id);
    END LOOP;

    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        IF item->>'parent_category_name' IS NOT NULL AND item->>'parent_category_name' != '' THEN
            SELECT item_id INTO v_parent_id FROM temp_category_map WHERE category_name = item->>'parent_category_name';
            IF v_parent_id IS NOT NULL THEN
                UPDATE public.inventory_turnover_report_items SET parent_category_id = v_parent_id
                WHERE report_id = v_report_id AND category_name = item->>'category_name';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;

-- Шаг 5: Обновление функции get_inventory_dashboard_summary
-- Логика выбора итоговых строк меняется с `level = 1` на `is_total_row = TRUE`.
CREATE OR REPLACE FUNCTION public.get_inventory_dashboard_summary(p_report_date date)
RETURNS TABLE(total_balance_rub numeric, total_quantity_pairs bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        SUM(itri.balance_rub) AS total_balance_rub,
        SUM(itri.quantity_pairs)::BIGINT AS total_quantity_pairs
    FROM public.inventory_turnover_report_items AS itri
    JOIN public.report_metadata AS rm ON itri.report_id = rm.id
    WHERE rm.report_date = p_report_date
      AND itri.is_total_row = TRUE -- ИЗМЕНЕНИЕ: используется новый флаг
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );
END;
$$;

-- Примечание: Функция get_dashboard_widget_data (в файле 001_create_dashboard_function.sql)
-- уже использует `is_total_row = true` для отчета 'inventory'.
-- После применения этой миграции она начнет работать корректно, так как столбец
-- is_total_row будет существовать в таблице inventory_turnover_report_items.
-- Поэтому изменять саму функцию get_dashboard_widget_data не требуется.

COMMIT;

