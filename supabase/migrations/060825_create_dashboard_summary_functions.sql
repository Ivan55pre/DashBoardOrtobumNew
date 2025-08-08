-- Функция для получения сводки по денежным средствам для виджета на дашборде.
-- Агрегирует данные по всем организациям, к которым у пользователя есть доступ.
CREATE OR REPLACE FUNCTION public.get_cash_bank_dashboard_summary(p_report_date date)
RETURNS TABLE(total_balance_current numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        SUM(cbri.balance_current) AS total_balance_current
    FROM public.cash_bank_report_items AS cbri
    JOIN public.report_metadata AS rm ON cbri.report_id = rm.id
    WHERE rm.report_date = p_report_date
      AND cbri.is_total_row = TRUE -- Агрегируем только итоговые строки по каждой организации
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );
END;
$$;

-- Функция для получения сводки по задолженностям для виджета на дашборде.
CREATE OR REPLACE FUNCTION public.get_debt_dashboard_summary(p_report_date date)
RETURNS TABLE(total_debt numeric, total_overdue numeric, total_credit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        SUM(dri.debt_amount) AS total_debt,
        SUM(dri.overdue_amount) AS total_overdue,
        SUM(dri.credit_amount) AS total_credit
    FROM public.debt_reports_items AS dri
    JOIN public.report_metadata AS rm ON dri.report_id = rm.id
    WHERE rm.report_date = p_report_date
      AND dri.is_total_row = TRUE
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );
END;
$$;

-- Функция для получения сводки по план-факту для виджета на дашборде.
CREATE OR REPLACE FUNCTION public.get_plan_fact_dashboard_summary(p_report_date date)
RETURNS TABLE(total_plan numeric, total_fact numeric, overall_execution_percent numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_total_plan NUMERIC;
    v_total_fact NUMERIC;
BEGIN
    SELECT
        SUM(pfri.plan_amount),
        SUM(pfri.fact_amount)
    INTO v_total_plan, v_total_fact
    FROM public.plan_fact_reports_items AS pfri
    JOIN public.report_metadata AS rm ON pfri.report_id = rm.id
    WHERE rm.report_date = p_report_date
      AND pfri.is_total_row = TRUE
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );

    RETURN QUERY
    SELECT
        COALESCE(v_total_plan, 0) AS total_plan,
        COALESCE(v_total_fact, 0) AS total_fact,
        CASE
            WHEN v_total_plan IS NOT NULL AND v_total_plan > 0 THEN (v_total_fact / v_total_plan) * 100
            ELSE 0
        END AS overall_execution_percent;
END;
$$;

-- Функция для получения сводки по товарным запасам для виджета на дашборде.
CREATE OR REPLACE FUNCTION public.get_inventory_dashboard_summary(p_report_date date)
RETURNS TABLE(total_balance_rub numeric, total_quantity_pairs bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        SUM(itri.balance_rub) AS total_balance_rub,
        SUM(itri.quantity_pairs)::BIGINT AS total_quantity_pairs
    FROM public.inventory_turnover_report_items AS itri
    JOIN public.report_metadata AS rm ON itri.report_id = rm.id
    WHERE rm.report_date = p_report_date
      AND itri.is_total_row = TRUE -- Агрегируем только итоговые строки по каждой организации
      AND rm.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = v_user_id
      );
END;
$$;