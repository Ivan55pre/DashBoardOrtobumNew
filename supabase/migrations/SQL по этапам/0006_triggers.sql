-- =============================================================
-- 0006_triggers.sql
-- Триггерные функции и триггеры.
-- =============================================================

-- Назначаем первого участника организации админом
create or replace function public.set_first_member_as_admin()
returns trigger language plpgsql security definer as $$
begin
    if (select count(*) from public.organization_members where organization_id = new.organization_id) = 1 then
        update public.organization_members set role = 'admin' where id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_new_member_set_admin_role on public.organization_members;
create trigger on_new_member_set_admin_role
after insert on public.organization_members
for each row execute function public.set_first_member_as_admin();

-- Автообновление updated_at в report_metadata
create or replace function public.update_report_metadata_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_report_metadata_timestamp on public.report_metadata;
create trigger update_report_metadata_timestamp
before update on public.report_metadata
for each row execute function public.update_report_metadata_timestamp();
