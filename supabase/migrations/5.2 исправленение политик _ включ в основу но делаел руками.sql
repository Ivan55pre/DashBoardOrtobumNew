-- 1.2.4 create_organization_members
-- Включаем RLS для новой таблицы
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Пользователи могут видеть всех членов организаций, в которых они состоят.
-- Это необходимо, чтобы другие политики (INSERT, UPDATE, DELETE) могли проверить роль пользователя.
CREATE POLICY "Users can view members of their own organizations."
ON organization_members FOR SELECT
USING (
  public.is_member_of(organization_members.organization_id, auth.uid())
);

-- Политика INSERT: Администраторы могут добавлять новых членов; пользователи могут присоединиться к новой (пустой) организации.
CREATE POLICY "Admins can add members; users can join a new org."
ON organization_members FOR INSERT
WITH CHECK (
  -- Условие 1: Текущий пользователь является администратором этой организации.
  (public.is_admin_of(organization_members.organization_id, auth.uid()))
  OR
  -- Условие 2: Пользователь добавляет сам себя в новую (пустую) организацию.
  -- Это позволяет создателю организации стать ее первым членом, которого триггер сделает администратором.
  (
    organization_members.user_id = auth.uid() AND
    public.is_organization_empty(organization_members.organization_id)
  )
);

-- Политика UPDATE: Только администраторы организации могут изменять роли участников.
CREATE POLICY "Admins can update member roles in their organization."
ON organization_members FOR UPDATE
USING (
  public.is_admin_of(organization_members.organization_id, auth.uid())
)
WITH CHECK (
  -- Нельзя понизить роль последнего администратора.
  -- Если пользователь является последним админом, его роль должна остаться 'admin'.
  (NOT public.is_last_admin_in_organization(organization_members.organization_id, organization_members.user_id)) OR (organization_members.role = 'admin')
);

-- Политика DELETE: Администраторы могут удалять участников, а любой участник может удалить себя.
CREATE POLICY "Admins can remove members, and users can remove themselves."
ON organization_members FOR DELETE
USING (
  -- Разрешаем удаление, если...
  (
    -- ...текущий пользователь является администратором ИЛИ удаляет сам себя.
    public.is_admin_of(organization_members.organization_id, auth.uid())
    OR (organization_members.user_id = auth.uid())
  )
  -- И при этом...
  -- ...удаляемый пользователь не является последним администратором в организации.
  AND (NOT public.is_last_admin_in_organization(organization_members.organization_id, organization_members.user_id))
);
