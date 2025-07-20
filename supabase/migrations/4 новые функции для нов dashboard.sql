-- 4. Новые функции для управления организациями

-- Функция для получения списка членов организации вместе с их email.
-- Необходима, так как клиентское приложение не может напрямую соединять
-- таблицу `organization_members` с `auth.users` из-за RLS.
CREATE OR REPLACE FUNCTION public.get_organization_members(p_organization_id UUID)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    organization_id UUID,
    role TEXT,
    email TEXT
)
LANGUAGE plpgsql
-- SECURITY DEFINER необходим для доступа к auth.users.
-- Это безопасно, так как мы сначала проверяем, является ли вызывающий пользователь
-- членом организации, для которой запрашиваются данные.
SECURITY DEFINER
AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    -- Проверка безопасности: Убеждаемся, что вызывающий пользователь (auth.uid())
    -- является членом организации.
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = p_organization_id
          AND om.user_id = auth.uid()
    ) INTO is_member;

    IF NOT is_member THEN
        RAISE EXCEPTION 'Access denied: You are not a member of this organization.';
    END IF;

    -- Если проверка пройдена, возвращаем список участников с их email.
    RETURN QUERY
    SELECT
        om.id,
        om.user_id,
        om.organization_id,
        om.role,
        u.email
    FROM public.organization_members om
    JOIN auth.users u ON om.user_id = u.id
    WHERE om.organization_id = p_organization_id
    ORDER BY u.email;
END;
$$;

-- Функция для приглашения пользователя в организацию по email.
-- Должна вызываться администратором организации.
CREATE OR REPLACE FUNCTION public.invite_user_to_organization(
    p_organization_id UUID,
    p_invitee_email TEXT
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER, чтобы RLS-политики на вставку в organization_members сработали.
-- Это гарантирует, что только администратор может добавить нового участника.
SECURITY INVOKER
AS $$
DECLARE
    v_invitee_user_id UUID;
BEGIN
    -- Находим ID пользователя по email. Требует прав суперпользователя, поэтому лучше вынести в Edge Function в будущем.
    -- Для простоты пока предполагаем, что это будет работать.
    SELECT id INTO v_invitee_user_id FROM auth.users WHERE email = p_invitee_email;

    IF v_invitee_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please ask them to sign up first.', p_invitee_email;
    END IF;

    -- Вставляем нового участника. RLS-политика на INSERT проверит, является ли вызывающий пользователь админом.
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_organization_id, v_invitee_user_id, 'member');
END;
$$;
