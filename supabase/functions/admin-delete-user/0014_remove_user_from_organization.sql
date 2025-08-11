-- 0014_remove_user_from_organization.sql
-- RPC для удаления пользователя из организации
-- Защита: нельзя удалить последнего администратора.

create or replace function public.remove_user_from_organization(
    p_organization_id uuid,
    p_user_email text
)
returns void
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
    v_is_admin boolean;
    v_admin_count integer;
begin
    -- Находим ID пользователя
    select id into v_user_id
    from auth.users
    where email = p_user_email;

    if v_user_id is null then
        raise exception 'Пользователь с email % не найден', p_user_email;
    end if;

    -- Проверяем, является ли удаляемый администратором
    select (role = 'admin') into v_is_admin
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_user_id;

    if v_is_admin then
        -- Считаем количество администраторов
        select count(*) into v_admin_count
        from public.organization_members
        where organization_id = p_organization_id
          and role = 'admin';

        if v_admin_count <= 1 then
            raise exception 'Нельзя удалить последнего администратора организации';
        end if;
    end if;

    -- Удаляем запись из organization_members
    delete from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_user_id;
end;
$$;
