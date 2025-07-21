-- Начинаем транзакцию, чтобы все изменения применились атомарно
BEGIN;

-- Шаг 1: Удаляем старые политики для таблицы inventory_turnover_report_items.
-- Использование "IF EXISTS" предотвращает ошибки, если какая-то из политик отсутствует.
DROP POLICY IF EXISTS "Allow members to read their organization's inventory items" ON public.inventory_turnover_report_items;
DROP POLICY IF EXISTS "Allow admins to insert inventory items" ON public.inventory_turnover_report_items;
DROP POLICY IF EXISTS "Allow admins to update inventory items" ON public.inventory_turnover_report_items;
DROP POLICY IF EXISTS "Allow admins to delete inventory items" ON public.inventory_turnover_report_items;

-- Шаг 2: Создаем новые, безопасные политики.

-- Политика SELECT: Разрешить членам организации читать строки отчета по товарам.
-- Проверяем, что пользователь (auth.uid()) является членом организации, к которой относится отчет.
CREATE POLICY "Allow members to read their organization's inventory items"
ON public.inventory_turnover_report_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.report_metadata rm
    JOIN public.organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id AND om.user_id = auth.uid()
  )
);

-- Политика INSERT: Разрешить администраторам организации добавлять строки отчета по товарам.
-- Проверяем, что пользователь является администратором (role = 'admin') в нужной организации.
CREATE POLICY "Allow admins to insert inventory items"
ON public.inventory_turnover_report_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.report_metadata rm
    JOIN public.organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Политика UPDATE: Разрешить администраторам организации обновлять строки отчета по товарам.
CREATE POLICY "Allow admins to update inventory items"
ON public.inventory_turnover_report_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.report_metadata rm
    JOIN public.organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Политика DELETE: Разрешить администраторам организации удалять строки отчета по товарам.
CREATE POLICY "Allow admins to delete inventory items"
ON public.inventory_turnover_report_items FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.report_metadata rm
    JOIN public.organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Завершаем транзакцию
COMMIT;
