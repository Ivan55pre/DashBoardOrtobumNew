-- Creates a function to aggregate data for dashboard widgets.
-- This function is called via RPC from the frontend.

CREATE OR REPLACE FUNCTION public.get_dashboard_widget_data(
    p_widget_type text,
    p_report_date date,
    p_organization_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    report_ids uuid[];
    result_json json;
BEGIN
    -- Find the most recent report IDs for each organization for the given type and date
    WITH latest_reports AS (
        SELECT DISTINCT ON (organization_id) id
        FROM report_metadata
        WHERE organization_id = ANY(p_organization_ids)
          AND report_type = p_widget_type
          AND report_date <= p_report_date
        ORDER BY organization_id, report_date DESC
    )
    SELECT array_agg(id) INTO report_ids FROM latest_reports;

    -- If no reports are found, return a default empty JSON
    IF report_ids IS NULL OR array_length(report_ids, 1) = 0 THEN
        RETURN '{}'::json;
    END IF;

    -- Calculate data based on widget type
    CASE p_widget_type
        WHEN 'cash_bank' THEN
            SELECT json_build_object('total_balance_current', COALESCE(SUM(balance_current), 0))
            INTO result_json
            FROM cash_bank_report_items
            WHERE report_id = ANY(report_ids) AND is_total_row = true;

        WHEN 'debt' THEN
            SELECT json_build_object('total_debt', COALESCE(SUM(debt_amount), 0), 'total_overdue', COALESCE(SUM(overdue_amount), 0), 'total_credit', COALESCE(SUM(credit_amount), 0))
            INTO result_json
            FROM debt_reports_items
            WHERE report_id = ANY(report_ids) AND is_total_row = true;

        WHEN 'inventory' THEN
            SELECT json_build_object('total_balance_rub', COALESCE(SUM(balance_rub), 0), 'total_quantity_pairs', COALESCE(SUM(quantity_pairs), 0))
            INTO result_json
            FROM inventory_turnover_report_items
            WHERE report_id = ANY(report_ids) AND is_total_row = true;

        WHEN 'plan_fact' THEN
            SELECT json_build_object('total_plan', COALESCE(SUM(plan_amount), 0), 'total_fact', COALESCE(SUM(fact_amount), 0), 'overall_execution_percent', CASE WHEN SUM(plan_amount) > 0 THEN (SUM(fact_amount) / SUM(plan_amount)) * 100 ELSE 0 END)
            INTO result_json
            FROM plan_fact_reports_items
            WHERE report_id = ANY(report_ids) AND is_total_row = true AND period_type = 'month';
        ELSE
            result_json := '{}'::json;
    END CASE;

    RETURN COALESCE(result_json, '{}'::json);
END;
$$;