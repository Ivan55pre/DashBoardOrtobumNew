-- =============================================================
-- 0012_dashboard_widget_data.sql
-- Универсальная функция данных для виджета дашборда.
-- Важно: для виджета 'inventory' используется report_type = 'inventory_turnover'.
-- =============================================================

create or replace function public.get_dashboard_widget_data(
    p_widget_type text,
    p_report_date date,
    p_organization_ids uuid[]
)
returns json
language plpgsql
as $$
declare
    current_report_ids uuid[];
    previous_report_ids uuid[];
    result_json json;
    v_report_type text;
begin
    -- Мэппинг типа виджета к типу отчёта в report_metadata
    v_report_type := case p_widget_type
        when 'inventory' then 'inventory_turnover'
        else p_widget_type
    end;

    -- Найти последние отчёты на указанную дату по каждой организации
    with latest_reports as (
        select distinct on (organization_id) id
        from report_metadata
        where organization_id = any(p_organization_ids)
          and report_type = v_report_type
          and report_date <= p_report_date
        order by organization_id, report_date desc
    )
    select array_agg(id) into current_report_ids from latest_reports;

    -- Найти последние отчёты на предыдущий день
    with latest_reports_prev as (
        select distinct on (organization_id) id
        from report_metadata
        where organization_id = any(p_organization_ids)
          and report_type = v_report_type
          and report_date <= (p_report_date - interval '1 day')
        order by organization_id, report_date desc
    )
    select array_agg(id) into previous_report_ids from latest_reports_prev;

    case p_widget_type
        when 'cash_bank' then
            select json_build_object(
                'total_balance_current', current_data.total,
                'change_percent', case 
                                    when prev_data.total <> 0 then ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    when current_data.total <> 0 then 100
                                    else 0 
                                  end
            )
            into result_json
            from 
                (select coalesce(sum(balance_current), 0) as total from cash_bank_report_items where report_id = any(current_report_ids) and is_total_row = true) as current_data,
                (select coalesce(sum(balance_current), 0) as total from cash_bank_report_items where report_id = any(previous_report_ids) and is_total_row = true) as prev_data;

        when 'debt' then
            select json_build_object(
                'total_debt', current_data.total,
                'change_percent', case 
                                    when prev_data.total <> 0 then ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    when current_data.total <> 0 then 100
                                    else 0 
                                  end
            )
            into result_json
            from 
                (select coalesce(sum(debt_amount), 0) as total from debt_reports_items where report_id = any(current_report_ids) and is_total_row = true) as current_data,
                (select coalesce(sum(debt_amount), 0) as total from debt_reports_items where report_id = any(previous_report_ids) and is_total_row = true) as prev_data;

        when 'inventory' then
            select json_build_object(
                'total_balance_rub', current_data.total,
                'change_percent', case 
                                    when prev_data.total <> 0 then ((current_data.total - prev_data.total) / prev_data.total) * 100 
                                    when current_data.total <> 0 then 100
                                    else 0 
                                  end
            )
            into result_json
            from 
                (select coalesce(sum(balance_rub), 0) as total from inventory_turnover_report_items where report_id = any(current_report_ids) and is_total_row = true) as current_data,
                (select coalesce(sum(balance_rub), 0) as total from inventory_turnover_report_items where report_id = any(previous_report_ids) and is_total_row = true) as prev_data;

        when 'plan_fact' then
            select json_build_object(
                'overall_execution_percent', current_data.percent,
                'change_percent', current_data.percent - prev_data.percent
            )
            into result_json
            from
                (select case when sum(plan_amount) > 0 then (sum(fact_amount) / sum(plan_amount)) * 100 else 0 end as percent from plan_fact_reports_items where report_id = any(current_report_ids) and is_total_row = true and period_type = 'month') as current_data,
                (select case when sum(plan_amount) > 0 then (sum(fact_amount) / sum(plan_amount)) * 100 else 0 end as percent from plan_fact_reports_items where report_id = any(previous_report_ids) and is_total_row = true and period_type = 'month') as prev_data;
        else
            result_json := '{}'::json;
    end case;

    return coalesce(result_json, '{}'::json);
end;
$$;
