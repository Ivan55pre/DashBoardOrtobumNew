-- =============================================================
-- 0013_compat_fixups_safe.sql
-- Безопасные исправления для случаев, когда база уже частично создана.
-- Для новой базы этот файл безвреден; все проверки оборачивают изменения.
-- =============================================================

begin;

-- Убедиться, что во всех *_report_items report_id NOT NULL + есть FK
alter table public.debt_reports_items alter column report_id set not null;
do $$
begin
    if not exists (
        select 1
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
        where con.conrelid = 'public.debt_reports_items'::regclass
          and con.contype = 'f'
          and att.attname = 'report_id'
    ) then
        alter table public.debt_reports_items
        add constraint debt_reports_items_report_id_fkey
        foreign key (report_id) references public.report_metadata(id) on delete cascade;
    end if;
end;
$$;

alter table public.inventory_turnover_report_items alter column report_id set not null;
do $$
begin
    if not exists (
        select 1
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
        where con.conrelid = 'public.inventory_turnover_report_items'::regclass
          and con.contype = 'f'
          and att.attname = 'report_id'
    ) then
        alter table public.inventory_turnover_report_items
        add constraint inventory_turnover_report_items_report_id_fkey
        foreign key (report_id) references public.report_metadata(id) on delete cascade;
    end if;
end;
$$;

alter table public.plan_fact_reports_items alter column report_id set not null;
do $$
begin
    if not exists (
        select 1
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
        where con.conrelid = 'public.plan_fact_reports_items'::regclass
          and con.contype = 'f'
          and att.attname = 'report_id'
    ) then
        alter table public.plan_fact_reports_items
        add constraint plan_fact_reports_items_report_id_fkey
        foreign key (report_id) references public.report_metadata(id) on delete cascade;
    end if;
end;
$$;

commit;
