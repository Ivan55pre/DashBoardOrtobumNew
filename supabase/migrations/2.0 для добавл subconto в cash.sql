-- Шаг 1: Добавление новой колонки 'subconto' в таблицу 'cash_bank_report_items'
-- Скрипт проверяет, существует ли колонка, чтобы избежать ошибок при повторном запуске.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cash_bank_report_items'
        AND column_name = 'subconto'
    ) THEN
        ALTER TABLE public.cash_bank_report_items ADD COLUMN subconto TEXT;
    END IF;
END;
$$;

-- Шаг 2: Обновление функции upsert_cash_bank_report для поддержки новой колонки 'subconto'
-- Эта функция используется для атомарной загрузки/обновления отчетов.
-- Мы заменяем ее целиком, добавляя обработку поля 'subconto' из входящего JSON.
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
BEGIN
    -- Найти или создать организацию по имени.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO v_organization_id;

    -- Найти или создать метаданные отчета.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'cash_bank', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Удалить старые данные для этого отчета, чтобы избежать дубликатов.
    DELETE FROM public.cash_bank_report_items WHERE report_id = v_report_id;

    -- Вставить новые строки отчета из JSON-массива, включая новое поле 'subconto'.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        INSERT INTO public.cash_bank_report_items (
            report_id,
            account_name,
            subconto, -- Новое поле
            balance_start,
            income_amount,
            expense_amount,
            balance_current,
            account_type,
            level,
            currency,
            is_total_row
        )
        VALUES (
            v_report_id,
            item->>'account_name',
            item->>'subconto', -- Новое значение из JSON
            (item->>'balance_start')::DECIMAL,
            (item->>'income_amount')::DECIMAL,
            (item->>'expense_amount')::DECIMAL,
            (item->>'balance_current')::DECIMAL,
            item->>'account_type',
            (item->>'level')::INTEGER,
            item->>'currency',
            (item->>'is_total_row')::BOOLEAN
        );
    END LOOP;

    -- Возвращаем ID созданного или обновленного отчета для подтверждения.
    RETURN v_report_id;
END;
$$;

