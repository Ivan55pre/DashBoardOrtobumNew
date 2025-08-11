-- =============================================================
-- 0009_dashboard_summaries.sql
-- Сводные функции для виджетов дашборда.
-- =============================================================

create or replace function public.get_cash_bank_dashboard_summary(p_report_date date)
returns table(total_balance_current numeric)
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
begin
    return query
    select
        sum(cbri.balance_current) as total_balance_current
    from public.cash_bank_report_items as cbri
    join public.report_metadata as rm on cbri.report_id = rm.id
    where rm.report_date = p_report_date
      and cbri.is_total_row = true
      and rm.organization_id in (
          select om.organization_id from public.organization_members om where om.user_id = v_user_id
      );
end;
$$;

create or replace function public.get_debt_dashboard_summary(p_report_date date)
returns table(total_debt numeric, total_overdue numeric, total_credit numeric)
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
begin
    return query
    select
        sum(dri.debt_amount) as total_debt,
        sum(dri.overdue_amount) as total_overdue,
        sum(dri.credit_amount) as total_credit
    from public.debt_reports_items as dri
    join public.report_metadata as rm on dri.report_id = rm.id
    where rm.report_date = p_report_date
      and dri.is_total_row = true
      and rm.organization_id in (
          select om.organization_id from public.organization_members om where om.user_id = v_user_id
      );
end;
$$;

create or replace function public.get_plan_fact_dashboard_summary(p_report_date date)
returns table(total_plan numeric, total_fact numeric, overall_execution_percent numeric)
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
    v_total_plan numeric;
    v_total_fact numeric;
begin
    select
        sum(pfri.plan_amount),
        sum(pfri.fact_amount)
    into v_total_plan, v_total_fact
    from public.plan_fact_reports_items as pfri
    join public.report_metadata as rm on pfri.report_id = rm.id
    where rm.report_date = p_report_date
      and pfri.is_total_row = true
      and rm.organization_id in (
          select om.organization_id from public.organization_members om where om.user_id = v_user_id
      );

    return query
    select
        coalesce(v_total_plan, 0) as total_plan,
        coalesce(v_total_fact, 0) as total_fact,
        case
            when v_total_plan is not null and v_total_plan > 0 then (v_total_fact / v_total_plan) * 100
            else 0
        end as overall_execution_percent;
end;
$$;

create or replace function public.get_inventory_dashboard_summary(p_report_date date)
returns table(total_balance_rub numeric, total_quantity_pairs bigint)
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
begin
    return query
    select
        sum(itri.balance_rub) as total_balance_rub,
        sum(itri.quantity_pairs)::bigint as total_quantity_pairs
    from public.inventory_turnover_report_items as itri
    join public.report_metadata as rm on itri.report_id = rm.id
    where rm.report_date = p_report_date
      and itri.is_total_row = true
      and rm.organization_id in (
          select om.organization_id from public.organization_members om where om.user_id = v_user_id
      );
end;
$$;
