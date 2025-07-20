
-- Alter table to add missing columns for hierarchy and RLS
ALTER TABLE public.plan_fact_reports_items
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.plan_fact_reports_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_type TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER,
  ADD COLUMN IF NOT EXISTS is_expandable BOOLEAN;

ALTER TABLE public.plan_fact_reports_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to read their organization's plan-fact items"
ON public.plan_fact_reports_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = plan_fact_reports_items.report_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Allow admins to manage plan-fact items"
ON public.plan_fact_reports_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = plan_fact_reports_items.report_id AND om.user_id = auth.uid() AND om.role = 'admin'
  )
);
