-- Этот скрипт исправляет schema-несоответствия, вызывающие ошибки во время выполнения.

BEGIN;

-- Шаг 1: Исправление foreign key в таблице 'debt_reports_items'.
-- Ошибка "Could not find a relationship..." указывает на отсутствующий foreign key.
-- Этот блок добавляет его, если он не существует.

-- Сначала убедимся, что колонка `report_id` не может быть пустой (NOT NULL) для целостности данных.
ALTER TABLE public.debt_reports_items
ALTER COLUMN report_id SET NOT NULL;

-- Затем добавим сам foreign key, если он отсутствует.
-- Этот DO-блок проверяет наличие ключа перед его созданием, чтобы избежать ошибок при повторном запуске.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.debt_reports_items'::regclass
          AND con.contype = 'f'
          AND att.attname = 'report_id'
    ) THEN
        ALTER TABLE public.debt_reports_items
        ADD CONSTRAINT debt_reports_items_report_id_fkey
        FOREIGN KEY (report_id) REFERENCES public.report_metadata(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- Шаг 2: Исправление опечатки в функции 'get_cash_bank_dashboard_summary'.
-- В условии JOIN по ошибке использовался псевдоним 'itri' вместо 'cbri'.
CREATE OR REPLACE FUNCTION public.get_cash_bank_dashboard_summary(p_report_date date)
RETURNS TABLE(total_balance_current numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        SUM(cbri.balance_current) AS total_balance_current
    FROM public.cash_bank_report_items AS cbri
    JOIN public.report_metadata AS rm ON cbri.report_id = rm.id -- ИСПРАВЛЕНО
    WHERE rm.report_date = p_report_date
      AND cbri.is_total_row = TRUE
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );
END;
$$;

COMMIT;
