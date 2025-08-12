-- =============================================================
-- 0005_rls_policies_idempotent.sql (fixed)
-- Включаем RLS и создаём политики, если их ещё нет.
-- Идемпотентно и без ссылок на OLD/NEW в RLS-выражениях.
-- =============================================================

-- organization_members
alter table public.organization_members enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view their own membership record.'
          AND schemaname = 'public'
          AND tablename = 'organization_members'
    ) THEN
        CREATE POLICY "Users can view their own membership record."
        ON public.organization_members
        FOR SELECT
        USING (user_id = auth.uid());
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can add members; users can join a new org.'
          AND schemaname = 'public'
          AND tablename = 'organization_members'
    ) THEN
        CREATE POLICY "Admins can add members; users can join a new org."
        ON public.organization_members
        FOR INSERT
        WITH CHECK (
          (public.is_admin_of(organization_members.organization_id, auth.uid())) OR
          (organization_members.user_id = auth.uid() AND public.is_organization_empty(organization_members.organization_id))
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can update member roles in their organization.'
          AND schemaname = 'public'
          AND tablename = 'organization_members'
    ) THEN
        CREATE POLICY "Admins can update member roles in their organization."
        ON public.organization_members
        FOR UPDATE
        USING (public.is_admin_of(organization_id, auth.uid()))
        -- В RLS нельзя ссылаться на OLD/NEW.
        -- USING применяется к старой строке, WITH CHECK — к новой.
        -- Блокируем понижение последнего админа: разрешаем апдейт, если
        -- (а) в организации есть другой админ ИЛИ (б) новая роль остаётся 'admin'.
        WITH CHECK (
          (NOT public.is_last_admin_in_organization(organization_id, user_id))
          OR (role = 'admin')
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can remove members, and users can remove themselves.'
          AND schemaname = 'public'
          AND tablename = 'organization_members'
    ) THEN
        CREATE POLICY "Admins can remove members, and users can remove themselves."
        ON public.organization_members
        FOR DELETE
        USING (
          (public.is_admin_of(organization_members.organization_id, auth.uid()) OR (organization_members.user_id = auth.uid())) AND
          (NOT public.is_last_admin_in_organization(organization_members.organization_id, organization_members.user_id))
        );
    END IF;
END
$$;

-- report_metadata
alter table public.report_metadata enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read their organization''s report metadata'
          AND schemaname = 'public'
          AND tablename = 'report_metadata'
    ) THEN
        CREATE POLICY "Allow members to read their organization's report metadata"
        ON public.report_metadata
        FOR SELECT
        USING (public.is_member_of(report_metadata.organization_id, auth.uid()));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow admins to manage report metadata'
          AND schemaname = 'public'
          AND tablename = 'report_metadata'
    ) THEN
        CREATE POLICY "Allow admins to manage report metadata"
        ON public.report_metadata
        FOR ALL
        WITH CHECK (public.is_admin_of(report_metadata.organization_id, auth.uid()));
    END IF;
END
$$;

-- cash_bank_report_items
alter table public.cash_bank_report_items enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read cash/bank items'
          AND schemaname = 'public'
          AND tablename = 'cash_bank_report_items'
    ) THEN
        CREATE POLICY "Allow members to read cash/bank items"
        ON public.cash_bank_report_items
        FOR SELECT
        USING (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = cash_bank_report_items.report_id
              AND public.is_member_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow admins to manage cash/bank items'
          AND schemaname = 'public'
          AND tablename = 'cash_bank_report_items'
    ) THEN
        CREATE POLICY "Allow admins to manage cash/bank items"
        ON public.cash_bank_report_items
        FOR ALL
        WITH CHECK (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = cash_bank_report_items.report_id
              AND public.is_admin_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

-- inventory_turnover_report_items
alter table public.inventory_turnover_report_items enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read inventory items'
          AND schemaname = 'public'
          AND tablename = 'inventory_turnover_report_items'
    ) THEN
        CREATE POLICY "Allow members to read inventory items"
        ON public.inventory_turnover_report_items
        FOR SELECT
        USING (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = inventory_turnover_report_items.report_id
              AND public.is_member_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow admins to manage inventory items'
          AND schemaname = 'public'
          AND tablename = 'inventory_turnover_report_items'
    ) THEN
        CREATE POLICY "Allow admins to manage inventory items"
        ON public.inventory_turnover_report_items
        FOR ALL
        WITH CHECK (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = inventory_turnover_report_items.report_id
              AND public.is_admin_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

-- plan_fact_reports_items
alter table public.plan_fact_reports_items enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read plan-fact items'
          AND schemaname = 'public'
          AND tablename = 'plan_fact_reports_items'
    ) THEN
        CREATE POLICY "Allow members to read plan-fact items"
        ON public.plan_fact_reports_items
        FOR SELECT
        USING (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = plan_fact_reports_items.report_id
              AND public.is_member_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow admins to manage plan-fact items'
          AND schemaname = 'public'
          AND tablename = 'plan_fact_reports_items'
    ) THEN
        CREATE POLICY "Allow admins to manage plan-fact items"
        ON public.plan_fact_reports_items
        FOR ALL
        WITH CHECK (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = plan_fact_reports_items.report_id
              AND public.is_admin_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

-- debt_reports_items
alter table public.debt_reports_items enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read debt items'
          AND schemaname = 'public'
          AND tablename = 'debt_reports_items'
    ) THEN
        CREATE POLICY "Allow members to read debt items"
        ON public.debt_reports_items
        FOR SELECT
        USING (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = debt_reports_items.report_id
              AND public.is_member_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow admins to manage debt items'
          AND schemaname = 'public'
          AND tablename = 'debt_reports_items'
    ) THEN
        CREATE POLICY "Allow admins to manage debt items"
        ON public.debt_reports_items
        FOR ALL
        WITH CHECK (EXISTS (
            SELECT 1
            FROM public.report_metadata rm
            WHERE rm.id = debt_reports_items.report_id
              AND public.is_admin_of(rm.organization_id, auth.uid())
        ));
    END IF;
END
$$;

-- summary tables (read-only)
alter table public.cash_bank_monthly_summaries enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read monthly summaries'
          AND schemaname = 'public'
          AND tablename = 'cash_bank_monthly_summaries'
    ) THEN
        CREATE POLICY "Allow members to read monthly summaries"
        ON public.cash_bank_monthly_summaries
        FOR SELECT
        USING (public.is_member_of(organization_id, auth.uid()));
    END IF;
END
$$;

alter table public.inventory_monthly_summaries enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read inventory summaries'
          AND schemaname = 'public'
          AND tablename = 'inventory_monthly_summaries'
    ) THEN
        CREATE POLICY "Allow members to read inventory summaries"
        ON public.inventory_monthly_summaries
        FOR SELECT
        USING (public.is_member_of(organization_id, auth.uid()));
    END IF;
END
$$;

alter table public.debt_monthly_summaries enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read debt summaries'
          AND schemaname = 'public'
          AND tablename = 'debt_monthly_summaries'
    ) THEN
        CREATE POLICY "Allow members to read debt summaries"
        ON public.debt_monthly_summaries
        FOR SELECT
        USING (public.is_member_of(organization_id, auth.uid()));
    END IF;
END
$$;

alter table public.plan_fact_monthly_summaries enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow members to read plan-fact summaries'
          AND schemaname = 'public'
          AND tablename = 'plan_fact_monthly_summaries'
    ) THEN
        CREATE POLICY "Allow members to read plan-fact summaries"
        ON public.plan_fact_monthly_summaries
        FOR SELECT
        USING (public.is_member_of(organization_id, auth.uid()));
    END IF;
END
$$;
