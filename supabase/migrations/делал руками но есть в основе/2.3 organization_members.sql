-- Шаг 1: Удаляем старую, более сложную политику SELECT, если она существует.
-- Использование "IF EXISTS" предотвращает ошибку, если политика с таким именем уже была удалена или переименована.
DROP POLICY IF EXISTS "Users can view members of their own organizations." ON public.organization_members;

-- Шаг 2: На всякий случай удаляем и новую политику, если она вдруг уже существует.
-- Это делает скрипт идемпотентным (безопасным для повторного запуска).
DROP POLICY IF EXISTS "Users can view their own membership record." ON public.organization_members;

-- Шаг 3: Создаем новую, упрощенную и более надежную политику SELECT.
-- Эта политика позволяет пользователю видеть только свою собственную запись о членстве в организации.
-- Этого достаточно для большинства клиентских запросов, это более безопасно и исключает возможные рекурсивные проверки.
CREATE POLICY "Users can view their own membership record."
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());
