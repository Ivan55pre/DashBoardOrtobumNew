-- =============================================================
-- 0003_indexes.sql
-- Прицельные индексы на часто используемые поля.
-- =============================================================

create index if not exists idx_debt_reports_items_report_id on public.debt_reports_items using btree (report_id);
create index if not exists idx_debt_reports_items_client_name on public.debt_reports_items using btree (client_name);
create index if not exists idx_debt_reports_items_parent_client_id on public.debt_reports_items using btree (parent_client_id);
create index if not exists idx_debt_reports_items_level on public.debt_reports_items using btree (level);
