-- использует Dashboard, не бот
-- Функция для атомарного создания организации и добавления создателя как первого участника.
CREATE OR REPLACE FUNCTION public.create_organization_and_add_creator(
    p_org_name TEXT
)
RETURNS UUID -- Возвращает ID новой организации
LANGUAGE plpgsql
-- SECURITY INVOKER, чтобы выполняться от имени пользователя и проверять его права через RLS.
SECURITY INVOKER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- Шаг 1: Создать организацию
    INSERT INTO public.organizations (name)
    VALUES (p_org_name)
    RETURNING id INTO v_org_id;

    -- Шаг 2: Добавить создателя как первого участника.
    -- Политика RLS на INSERT в organization_members будет проверена здесь.
    -- Она сработает, так как пользователь добавляет себя в пустую организацию.
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'member'); -- Триггер затем повысит роль до 'admin'

    RETURN v_org_id;
END;
$$;
