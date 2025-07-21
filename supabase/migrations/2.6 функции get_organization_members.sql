-- Удаляем старую версию функции, если она существует, чтобы избежать конфликтов.
DROP FUNCTION IF EXISTS public.get_organization_members(UUID);

-- Создаем новую, исправленную версию функции.
CREATE OR REPLACE FUNCTION public.get_organization_members(p_organization_id UUID)
RETURNS TABLE (
    member_id BIGINT,
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
    -- Явный псевдоним "AS member_id" обеспечивает соответствие с RETURNS TABLE.
    RETURN QUERY
    SELECT
        om.id AS member_id,
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
