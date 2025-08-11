-- =============================================================
-- 0004_rls_helpers.sql
-- Вспомогательные функции для RLS-политик.
-- =============================================================

create or replace function public.is_member_of(p_organization_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id and om.user_id = p_user_id
  );
$$;

create or replace function public.is_admin_of(p_organization_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id and om.user_id = p_user_id and om.role = 'admin'
  );
$$;

create or replace function public.is_organization_empty(p_organization_id uuid)
returns boolean language sql security definer stable as $$
  select not exists (select 1 from public.organization_members om where om.organization_id = p_organization_id);
$$;

create or replace function public.is_last_admin_in_organization(p_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer as $$
declare
    admin_count integer;
    is_user_an_admin boolean;
begin
    select exists (
        select 1 from public.organization_members om
        where om.organization_id = p_organization_id and om.user_id = p_user_id and om.role = 'admin'
    ) into is_user_an_admin;

    if not is_user_an_admin then
        return false;
    end if;

    select count(*) into admin_count from public.organization_members om
    where om.organization_id = p_organization_id and om.role = 'admin';

    return admin_count = 1;
end;
$$;
