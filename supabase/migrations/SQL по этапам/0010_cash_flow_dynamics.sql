-- =============================================================
-- 0010_cash_flow_dynamics.sql
-- Динамика денежных средств по выбранным организациям и диапазону дат.
-- =============================================================

create or replace function public.get_cash_flow_dynamics(
    p_organization_ids uuid[],
    p_start_date date,
    p_end_date date
)
returns table(report_day date, total_balance numeric)
language plpgsql
security definer
as $$
begin
    return query
    select
        rm.report_date as report_day,
        sum(cbri.balance_current) as total_balance
    from public.cash_bank_report_items as cbri
    join public.report_metadata as rm on cbri.report_id = rm.id
    where
        rm.organization_id = any(p_organization_ids)
        and rm.report_date >= p_start_date
        and rm.report_date <= p_end_date
        and cbri.is_total_row = true
    group by rm.report_date
    order by rm.report_date asc;
end;
$$;
