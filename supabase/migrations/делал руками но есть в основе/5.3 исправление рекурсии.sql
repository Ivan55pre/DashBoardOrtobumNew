-- Функция для проверки, является ли пользователь последним администратором в организации.
-- Исправлена для предотвращения рекурсии.
CREATE OR REPLACE FUNCTION public.is_last_admin_in_organization(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Рекомендуется для функций с SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
    is_user_an_admin BOOLEAN;
BEGIN
    -- Временно обходим RLS, переключая роль на 'postgres' (у которой есть атрибут BYPASSRLS).
    -- Это предотвращает бесконечную рекурсию.
    SET LOCAL role = 'postgres';

    -- Проверяем, является ли указанный пользователь администратором в этой организации
    SELECT EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role = 'admin'
    ) INTO is_user_an_admin;

    IF is_user_an_admin THEN
        -- Считаем общее количество администраторов в организации
        SELECT count(*) INTO admin_count FROM organization_members om
        WHERE om.organization_id = p_organization_id AND om.role = 'admin';
        
        -- SET LOCAL действует в рамках транзакции и сбросится после выхода из функции.
        RETURN admin_count = 1;
    END IF;

    -- SET LOCAL сбросится после выхода из функции.
    RETURN FALSE; -- Если он не админ, он не может быть последним админом.
END;
$$;


-- Функция для проверки, является ли пользователь членом организации.
-- Исправлена для предотвращения рекурсии.
CREATE OR REPLACE FUNCTION public.is_member_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SET LOCAL role = 'postgres';
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id
  ) INTO is_member;
  RETURN is_member;
END;
$$;


-- Функция для проверки, является ли пользователь администратором организации.
-- Исправлена для предотвращения рекурсии.
CREATE OR REPLACE FUNCTION public.is_admin_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SET LOCAL role = 'postgres';
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role = 'admin'
  ) INTO is_admin;
  RETURN is_admin;
END;
$$;


-- Функция для проверки, пуста ли организация (нет ли в ней участников).
-- Исправлена для предотвращения рекурсии.
CREATE OR REPLACE FUNCTION public.is_organization_empty(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_empty BOOLEAN;
BEGIN
  SET LOCAL role = 'postgres';
  SELECT NOT EXISTS (
    SELECT 1 FROM organization_members om WHERE om.organization_id = p_organization_id
  ) INTO is_empty;
  RETURN is_empty;
END;
$$;

