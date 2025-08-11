-- =============================================================
-- 0005_rls_policies.sql
-- Включаем RLS и описываем политики доступа.
-- =============================================================

-- organization_members
alter table public.organization_members enable row level security;

create policy if not exists "Users can view their own membership record."
on public.organization_members for select
using (user_id = auth.uid());

create policy if not exists "Admins can add members; users can join a new org."
on public.organization_members for insert
with check (
  (public.is_admin_of(organization_members.organization_id, auth.uid())) or
  (organization_members.user_id = auth.uid() and public.is_organization_empty(organization_members.organization_id))
);

create policy if not exists "Admins can update member roles in their organization."
on public.organization_members for update
using (public.is_admin_of(organization_id, auth.uid()))
with check (
  (not public.is_last_admin_in_organization(old.organization_id, old.user_id))
  or (role = 'admin' and organization_id = old.organization_id)
);

create policy if not exists "Admins can remove members, and users can remove themselves."
on public.organization_members for delete
using (
  (public.is_admin_of(organization_members.organization_id, auth.uid()) or (organization_members.user_id = auth.uid())) and
  (not public.is_last_admin_in_organization(organization_members.organization_id, organization_members.user_id))
);

-- report_metadata
alter table public.report_metadata enable row level security;
create policy if not exists "Allow members to read their organization's report metadata"
on public.report_metadata for select
using (public.is_member_of(report_metadata.organization_id, auth.uid()));
create policy if not exists "Allow admins to manage report metadata"
on public.report_metadata for all
with check (public.is_admin_of(report_metadata.organization_id, auth.uid()));

-- cash_bank_report_items
alter table public.cash_bank_report_items enable row level security;
create policy if not exists "Allow members to read cash/bank items"
on public.cash_bank_report_items for select
using (exists (select 1 from public.report_metadata rm where rm.id = cash_bank_report_items.report_id and public.is_member_of(rm.organization_id, auth.uid())));
create policy if not exists "Allow admins to manage cash/bank items"
on public.cash_bank_report_items for all
with check (exists (select 1 from public.report_metadata rm where rm.id = cash_bank_report_items.report_id and public.is_admin_of(rm.organization_id, auth.uid())));

-- inventory_turnover_report_items
alter table public.inventory_turnover_report_items enable row level security;
create policy if not exists "Allow members to read inventory items"
on public.inventory_turnover_report_items for select
using (exists (select 1 from public.report_metadata rm where rm.id = inventory_turnover_report_items.report_id and public.is_member_of(rm.organization_id, auth.uid())));
create policy if not exists "Allow admins to manage inventory items"
on public.inventory_turnover_report_items for all
with check (exists (select 1 from public.report_metadata rm where rm.id = inventory_turnover_report_items.report_id and public.is_admin_of(rm.organization_id, auth.uid())));

-- plan_fact_reports_items
alter table public.plan_fact_reports_items enable row level security;
create policy if not exists "Allow members to read plan-fact items"
on public.plan_fact_reports_items for select
using (exists (select 1 from public.report_metadata rm where rm.id = plan_fact_reports_items.report_id and public.is_member_of(rm.organization_id, auth.uid())));
create policy if not exists "Allow admins to manage plan-fact items"
on public.plan_fact_reports_items for all
with check (exists (select 1 from public.report_metadata rm where rm.id = plan_fact_reports_items.report_id and public.is_admin_of(rm.organization_id, auth.uid())));

-- debt_reports_items
alter table public.debt_reports_items enable row level security;
create policy if not exists "Allow members to read debt items"
on public.debt_reports_items for select
using (exists (select 1 from public.report_metadata rm where rm.id = debt_reports_items.report_id and public.is_member_of(rm.organization_id, auth.uid())));
create policy if not exists "Allow admins to manage debt items"
on public.debt_reports_items for all
with check (exists (select 1 from public.report_metadata rm where rm.id = debt_reports_items.report_id and public.is_admin_of(rm.organization_id, auth.uid())));

-- summary tables (read-only)
alter table public.cash_bank_monthly_summaries enable row level security;
create policy if not exists "Allow members to read monthly summaries"
on public.cash_bank_monthly_summaries for select
using (public.is_member_of(organization_id, auth.uid()));

alter table public.inventory_monthly_summaries enable row level security;
create policy if not exists "Allow members to read inventory summaries"
on public.inventory_monthly_summaries for select
using (public.is_member_of(organization_id, auth.uid()));

alter table public.debt_monthly_summaries enable row level security;
create policy if not exists "Allow members to read debt summaries"
on public.debt_monthly_summaries for select
using (public.is_member_of(organization_id, auth.uid()));

alter table public.plan_fact_monthly_summaries enable row level security;
create policy if not exists "Allow members to read plan-fact summaries"
on public.plan_fact_monthly_summaries for select
using (public.is_member_of(organization_id, auth.uid()));
