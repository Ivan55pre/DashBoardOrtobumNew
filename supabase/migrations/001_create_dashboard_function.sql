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
    current_report_ids uuid[];
    previous_report_ids uuid[];
    result_json json;
BEGIN
    -- Find report IDs for the current date
    WITH latest_reports AS (
        SELECT DISTINCT ON (organization_id) id
        FROM report_metadata
        WHERE organization_id = ANY(p_organization_ids)
          AND report_type = p_widget_type
          AND report_date <= p_report_date
        ORDER BY organization_id, report_date DESC
    )
    SELECT array_agg(id) INTO current_report_ids FROM latest_reports;

    -- Find report IDs for the previous day
    WITH latest_reports_prev AS (
        SELECT DISTINCT ON (organization_id) id
        FROM report_metadata
        WHERE organization_id = ANY(p_organization_ids)
          AND report_type = p_widget_type
          AND report_date <= (p_report_date - interval '1 day')
        ORDER BY organization_id, report_date DESC
    )
    SELECT array_agg(id) INTO previous_report_ids FROM latest_reports_prev;

    -- Calculate data based on widget type
    CASE p_widget_type
        WHEN 'cash_bank' THEN
            SELECT json_build_object(
                'total_balance_current', current_data.total,
                'change_percent', CASE 
                                    WHEN prev_data.total <> 0 THEN ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    WHEN current_data.total <> 0 THEN 100
                                    ELSE 0 
                                  END
            )
            INTO result_json
            FROM 
                (SELECT COALESCE(SUM(balance_current), 0) as total FROM cash_bank_report_items WHERE report_id = ANY(current_report_ids) AND is_total_row = true) as current_data,
                (SELECT COALESCE(SUM(balance_current), 0) as total FROM cash_bank_report_items WHERE report_id = ANY(previous_report_ids) AND is_total_row = true) as prev_data;

        WHEN 'debt' THEN
            SELECT json_build_object(
                'total_debt', current_data.total,
                'change_percent', CASE 
                                    WHEN prev_data.total <> 0 THEN ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    WHEN current_data.total <> 0 THEN 100
                                    ELSE 0 
                                  END
            )
            INTO result_json
            FROM 
                (SELECT COALESCE(SUM(debt_amount), 0) as total FROM debt_reports_items WHERE report_id = ANY(current_report_ids) AND is_total_row = true) as current_data,
                (SELECT COALESCE(SUM(debt_amount), 0) as total FROM debt_reports_items WHERE report_id = ANY(previous_report_ids) AND is_total_row = true) as prev_data;

        WHEN 'inventory' THEN
            SELECT json_build_object(
                'total_balance_rub', current_data.total,
                'change_percent', CASE 
                                    WHEN prev_data.total <> 0 THEN ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    WHEN current_data.total <> 0 THEN 100
                                    ELSE 0 
                                  END
            )
            INTO result_json
            FROM 
                (SELECT COALESCE(SUM(balance_rub), 0) as total FROM inventory_turnover_report_items WHERE report_id = ANY(current_report_ids) AND is_total_row = true) as current_data,
                (SELECT COALESCE(SUM(balance_rub), 0) as total FROM inventory_turnover_report_items WHERE report_id = ANY(previous_report_ids) AND is_total_row = true) as prev_data;

        WHEN 'plan_fact' THEN
            SELECT json_build_object(
                'overall_execution_percent', current_data.percent,
                'change_percent', current_data.percent - prev_data.percent -- Absolute change in percentage points
            )
            INTO result_json
            FROM
                (SELECT CASE WHEN SUM(plan_amount) > 0 THEN (SUM(fact_amount) / SUM(plan_amount)) * 100 ELSE 0 END as percent FROM plan_fact_reports_items WHERE report_id = ANY(current_report_ids) AND is_total_row = true AND period_type = 'month') as current_data,
                (SELECT CASE WHEN SUM(plan_amount) > 0 THEN (SUM(fact_amount) / SUM(plan_amount)) * 100 ELSE 0 END as percent FROM plan_fact_reports_items WHERE report_id = ANY(previous_report_ids) AND is_total_row = true AND period_type = 'month') as prev_data;
        ELSE
            result_json := '{}'::json;
    END CASE;

    RETURN COALESCE(result_json, '{}'::json);
END;
$$;