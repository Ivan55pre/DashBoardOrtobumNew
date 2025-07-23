CREATE OR REPLACE FUNCTION public.upsert_cash_bank_report(
    p_organization_name TEXT,
    p_report_date DATE,
    p_report_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_report_id UUID;
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

    -- Шаг 4: Вставка иерархических строк с последующим UPDATE parent_id.
    WITH
    source_data AS (
        SELECT
            NULLIF(TRIM(val->>'account_id'), '') AS account_id,
            NULLIF(TRIM(val->>'parent_account_id'), '') AS parent_account_id,
            val->>'account_name' AS account_name,
            val->>'subconto' AS subconto,
            (COALESCE(val->>'balance_start', val->>'СуммаНачальныйОстаток'))::DECIMAL AS balance_start,
            (COALESCE(val->>'income_amount', val->>'СуммаОборотДт'))::DECIMAL AS income_amount,
            (COALESCE(val->>'expense_amount', val->>'СуммаОборотКт'))::DECIMAL AS expense_amount,
            (COALESCE(val->>'balance_current', val->>'СуммаКонечныйОстаток'))::DECIMAL AS balance_current,
            val->>'account_type' AS account_type,
            (val->>'level')::INTEGER AS level,
            val->>'currency' AS currency,
            (val->>'is_total_row')::BOOLEAN AS is_total_row
        FROM jsonb_array_elements(p_report_items) AS val
    ),
    inserted_rows AS (
        INSERT INTO public.cash_bank_report_items (
            report_id, account_id, parent_account_id, account_name, subconto,
            balance_start, income_amount, expense_amount, balance_current,
            account_type, level, currency, is_total_row, parent_id
        )
        SELECT
            v_report_id, sd.account_id, sd.parent_account_id, sd.account_name, sd.subconto,
            sd.balance_start, sd.income_amount, sd.expense_amount, sd.balance_current,
            sd.account_type, sd.level, sd.currency, sd.is_total_row, NULL
        FROM source_data sd
        RETURNING id, account_id, parent_account_id
    ),
    parent_map AS (
        SELECT
            child.id AS child_id,
            parent.id AS parent_id
        FROM inserted_rows AS child
        JOIN inserted_rows AS parent
          ON child.parent_account_id IS NOT NULL
         AND child.parent_account_id = parent.account_id
         -- главное! только внутри текущего батча, а не по всем данным вообще
    )
    UPDATE public.cash_bank_report_items AS target
    SET parent_id = pm.parent_id
    FROM parent_map AS pm
    WHERE target.id = pm.child_id;

    RETURN v_report_id;
END;
$$;
