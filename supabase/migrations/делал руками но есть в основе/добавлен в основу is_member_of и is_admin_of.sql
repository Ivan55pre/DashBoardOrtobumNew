

-- Вспомогательные функции для RLS, чтобы избежать бесконечной рекурсии

-- Функция для проверки, является ли пользователь членом организации.
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_member_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id
  );
$$;

-- Функция для проверки, является ли пользователь администратором организации.
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_admin_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role = 'admin'
  );
$$;

-- Функция для проверки, пуста ли организация (нет ли в ней участников).
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_organization_empty(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = p_organization_id);
$$;