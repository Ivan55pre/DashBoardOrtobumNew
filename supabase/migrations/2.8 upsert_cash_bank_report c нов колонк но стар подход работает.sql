-- 1.9 create_upsert_report_function
-- Функция для атомарной загрузки/обновления отчета по остаткам.
-- Она находит или создает организацию, создает метаданные отчета и загружает данные.
-- Использует двухпроходный метод для построения иерархии по account_id и parent_account_id.
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
    -- Создаем временную таблицу для сопоставления account_id с их новыми UUID.
    CREATE TEMP TABLE temp_id_map (
        account_id TEXT PRIMARY KEY,
        item_id UUID NOT NULL
    ) ON COMMIT DROP;

    -- Первый проход: вставляем все элементы с NULL в parent_id и заполняем карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        INSERT INTO public.cash_bank_report_items (
            report_id, account_id, parent_account_id, account_name, subconto, 
            balance_start, income_amount, expense_amount, balance_current, 
            account_type, level, currency, is_total_row, parent_id
        )
        VALUES (
            v_report_id, 
            item->>'account_id',
            item->>'parent_account_id',
            item->>'account_name', 
            item->>'subconto', 
            (item->>'balance_start')::DECIMAL(15,2), 
            (item->>'income_amount')::DECIMAL(15,2), 
            (item->>'expense_amount')::DECIMAL(15,2), 
            (item->>'balance_current')::DECIMAL(15,2), 
            item->>'account_type', 
            (item->>'level')::INTEGER, 
            item->>'currency', 
            (item->>'is_total_row')::BOOLEAN,
            NULL -- parent_id изначально NULL
        )
        RETURNING id INTO v_item_id;

        -- Заполняем карту сопоставления account_id -> item_id (UUID).
        -- Проверяем, что account_id не пустой, чтобы избежать ошибок с PRIMARY KEY.
        IF item->>'account_id' IS NOT NULL AND TRIM(item->>'account_id') != '' THEN
            INSERT INTO temp_id_map (account_id, item_id) 
            VALUES (item->>'account_id', v_item_id)
            ON CONFLICT (account_id) DO NOTHING; -- Игнорируем дубликаты, если они есть.
        END IF;
    END LOOP;

    -- Второй проход: обновляем parent_id, используя карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        -- Проверяем, есть ли у элемента родительский ID.
        IF item->>'parent_account_id' IS NOT NULL AND TRIM(item->>'parent_account_id') != '' THEN
            -- Находим UUID родителя в нашей временной карте.
            SELECT item_id INTO v_parent_id FROM temp_id_map WHERE account_id = item->>'parent_account_id';
            
            -- Если родитель найден, обновляем запись.
            IF v_parent_id IS NOT NULL THEN
                -- Находим дочернюю строку по ее собственному account_id и обновляем ее parent_id.
                UPDATE public.cash_bank_report_items SET parent_id = v_parent_id
                WHERE report_id = v_report_id AND account_id = item->>'account_id';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;
