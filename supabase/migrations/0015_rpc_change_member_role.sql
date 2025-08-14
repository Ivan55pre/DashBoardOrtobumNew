-- =============================================================
-- 0015_rpc_change_member_role.sql
-- RPC для изменения роли участника организации.
-- Защита: нельзя понизить последнего администратора.
-- =============================================================

create or replace function public.change_member_role(
    p_member_id bigint,
    p_new_role text
)
returns void
language plpgsql
security definer
as $$
declare
    v_organization_id uuid;
    v_current_role text;
    v_caller_id uuid := auth.uid();
begin
    -- 1. Получаем ID организации и текущую роль участника, чтобы проверить права.
    select organization_id, role into v_organization_id, v_current_role
    from public.organization_members
    where id = p_member_id;

    if not found then
        raise exception 'Участник с ID % не найден.', p_member_id;
    end if;

    -- 2. Проверяем, является ли вызывающий пользователь администратором этой организации.
    -- Это ключевая проверка безопасности, т.к. функция обходит RLS.
    if not public.is_admin_of(v_organization_id, v_caller_id) then
        raise exception 'Доступ запрещен: только администратор может изменять роли.';
    end if;

    -- 3. Проверяем логику понижения роли. Повышать до админа можно всегда.
    if v_current_role = 'admin' and p_new_role = 'member' then
        if (select count(*) from public.organization_members where organization_id = v_organization_id and role = 'admin') <= 1 then
            raise exception 'Нельзя понизить в правах последнего администратора организации.';
        end if;
    end if;

    -- 4. Выполняем обновление.
    update public.organization_members
    set role = p_new_role
    where id = p_member_id;
end;
$$;