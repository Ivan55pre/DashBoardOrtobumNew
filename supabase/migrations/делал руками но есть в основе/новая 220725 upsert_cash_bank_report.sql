-- 1.9 create_upsert_report_function
-- Функция для атомарной загрузки/обновления отчета по остаткам.
-- Она находит или создает организацию, создает метаданные отчета и загружает данные.
-- Идеально подходит для вызова из внешних систем, таких как n8n.
CREATE OR REPLACE FUNCTION public.upsert_cash_bank_report(
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
    -- Шаг 1: Найти или создать организацию.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO v_organization_id;

    -- Шаг 2: Найти или создать метаданные отчета.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'cash_bank', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Шаг 3: Удалить старые данные для этого отчета.
    DELETE FROM public.cash_bank_report_items WHERE report_id = v_report_id;

    -- Шаг 4: Вставить новые строки отчета, обрабатывая иерархию.
    -- Создаем временную таблицу для сопоставления имен счетов с их новыми UUID.
    CREATE TEMP TABLE temp_account_map (
        account_name TEXT PRIMARY KEY,
        item_id UUID NOT NULL
    ) ON COMMIT DROP;

    -- Первый проход: вставляем все элементы с NULL в parent_id и заполняем карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        INSERT INTO public.cash_bank_report_items (
            report_id, account_name, subconto, balance_start, 
            income_amount, expense_amount, balance_current, 
            account_type, level, currency, is_total_row, parent_id
        )
            -- Используем английские ключи, которые должен готовить n8n
            -- ИСПРАВЛЕНО: Используем русские ключи напрямую из исходного JSON.
            -- Это делает функцию устойчивой, даже если n8n не преобразует поля.
        VALUES (
            v_report_id,
            item->>'account_name',
            item->>'subconto',
            (COALESCE(item->>'balance_start', item->>'СуммаНачальныйОстаток'))::DECIMAL,
            (COALESCE(item->>'income_amount', item->>'СуммаОборотДт'))::DECIMAL,
            (COALESCE(item->>'expense_amount', item->>'СуммаОборотКт'))::DECIMAL,
            (COALESCE(item->>'balance_current', item->>'СуммаКонечныйОстаток'))::DECIMAL,
            item->>'account_type',
            (item->>'level')::INTEGER,
            item->>'currency',
            (item->>'is_total_row')::BOOLEAN,
            NULL -- parent_id изначально NULL
        )
        RETURNING id INTO v_item_id;
        -- Добавляем запись в карту. Убедитесь, что account_name уникален для каждой строки в JSON.
        INSERT INTO temp_account_map (account_name, item_id) 
        VALUES (item->>'account_name', v_item_id)
        ON CONFLICT (account_name) DO NOTHING; -- Игнорируем дубликаты, если они есть
    END LOOP;

    -- Второй проход: обновляем parent_id, используя карту.
    -- Предполагается, что в JSON есть поле 'parent_account_name'.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        IF item->>'parent_account_name' IS NOT NULL AND item->>'parent_account_name' != '' THEN
            SELECT item_id INTO v_parent_id FROM temp_account_map WHERE account_name = item->>'parent_account_name';
            IF v_parent_id IS NOT NULL THEN
                -- Находим строку по уникальному имени счета в рамках этого отчета и обновляем ее
                UPDATE public.cash_bank_report_items SET parent_id = v_parent_id
                WHERE report_id = v_report_id AND account_name = item->>'account_name';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;
