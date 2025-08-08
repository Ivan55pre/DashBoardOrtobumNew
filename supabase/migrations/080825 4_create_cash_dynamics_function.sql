-- Функция для получения динамики денежных средств за период.
-- Агрегирует итоговые балансы по дням для выбранных организаций.

CREATE OR REPLACE FUNCTION public.get_cash_flow_dynamics(
    p_organization_ids uuid[],
    p_start_date date,
    p_end_date date
)
RETURNS TABLE(report_day date, total_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rm.report_date AS report_day,
        SUM(cbri.balance_current) AS total_balance
    FROM public.cash_bank_report_items AS cbri
    JOIN public.report_metadata AS rm ON cbri.report_id = rm.id
    WHERE
        rm.organization_id = ANY(p_organization_ids)
        AND rm.report_date >= p_start_date
        AND rm.report_date <= p_end_date
        AND cbri.is_total_row = TRUE
    GROUP BY rm.report_date
    ORDER BY rm.report_date ASC;
END;
$$;