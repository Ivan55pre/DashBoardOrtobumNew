-- =============================================================
-- 0011_upsert_reports.sql
-- Upsert-функции для загрузки/перезаписи отчетов (cash_bank, inventory_turnover, plan_fact).
-- =============================================================

-- Cash & Bank
create or replace function public.upsert_cash_bank_report(p_organization_name text, p_report_date date, p_report_items jsonb)
returns uuid language plpgsql security definer as $$
declare
    v_organization_id uuid;
    v_report_id uuid;
    item jsonb;
    v_item_id uuid;
    v_parent_id uuid;
begin
    insert into public.organizations (name) values (p_organization_name)
    on conflict (name) do update set name = excluded.name
    returning id into v_organization_id;

    insert into public.report_metadata (organization_id, report_type, report_date, updated_at)
    values (v_organization_id, 'cash_bank', p_report_date, now())
    on conflict (organization_id, report_type, report_date) do update set updated_at = now()
    returning id into v_report_id;

    delete from public.cash_bank_report_items where report_id = v_report_id;

    create temp table temp_id_map (account_id text primary key, item_id uuid not null) on commit drop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        insert into public.cash_bank_report_items (
            report_id, account_id, parent_account_id, account_name, subconto,
            balance_start, income_amount, expense_amount, balance_current,
            account_type, level, currency, is_total_row, parent_id
        ) values (
            v_report_id, item->>'account_id', item->>'parent_account_id', item->>'account_name', item->>'subconto',
            (item->>'balance_start')::decimal(15,2), (item->>'income_amount')::decimal(15,2),
            (item->>'expense_amount')::decimal(15,2), (item->>'balance_current')::decimal(15,2),
            item->>'account_type', (item->>'level')::integer, item->>'currency', (item->>'is_total_row')::boolean, null
        ) returning id into v_item_id;

        if item->>'account_id' is not null and trim(item->>'account_id') != '' then
            insert into temp_id_map (account_id, item_id)
            values (item->>'account_id', v_item_id)
            on conflict (account_id) do nothing;
        end if;
    end loop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        if item->>'parent_account_id' is not null and trim(item->>'parent_account_id') != '' then
            select item_id into v_parent_id from temp_id_map where account_id = item->>'parent_account_id';
            if v_parent_id is not null then
                update public.cash_bank_report_items set parent_id = v_parent_id
                where report_id = v_report_id and account_id = item->>'account_id';
            end if;
        end if;
    end loop;

    return v_report_id;
end;
$$;

-- Inventory Turnover (c поддержкой is_total_row)
create or replace function public.upsert_inventory_turnover_report(p_organization_name text, p_report_date date, p_report_items jsonb)
returns uuid language plpgsql security definer as $$
declare
    v_organization_id uuid;
    v_report_id uuid;
    item jsonb;
    v_item_id uuid;
    v_parent_id uuid;
begin
    insert into public.organizations (name) values (p_organization_name)
    on conflict (name) do update set name = excluded.name
    returning id into v_organization_id;

    insert into public.report_metadata (organization_id, report_type, report_date, updated_at)
    values (v_organization_id, 'inventory_turnover', p_report_date, now())
    on conflict (organization_id, report_type, report_date) do update set updated_at = now()
    returning id into v_report_id;

    delete from public.inventory_turnover_report_items where report_id = v_report_id;

    create temp table temp_category_map (category_name text primary key, item_id uuid not null) on commit drop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        insert into public.inventory_turnover_report_items (
            report_id, category_name, quantity_pairs, balance_rub, dynamics_start_month_rub,
            dynamics_start_month_percent, dynamics_start_year_rub, dynamics_start_year_percent,
            turnover_days, level, is_total_row
        ) values (
            v_report_id,
            item->>'category_name',
            (item->>'quantity_pairs')::integer,
            (item->>'balance_rub')::decimal,
            (item->>'dynamics_start_month_rub')::decimal,
            (item->>'dynamics_start_month_percent')::decimal,
            (item->>'dynamics_start_year_rub')::decimal,
            (item->>'dynamics_start_year_percent')::decimal,
            (item->>'turnover_days')::integer,
            (item->>'level')::integer,
            coalesce((item->>'is_total_row')::boolean, false)
        ) returning id into v_item_id;

        insert into temp_category_map (category_name, item_id) values (item->>'category_name', v_item_id);
    end loop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        if item->>'parent_category_name' is not null and item->>'parent_category_name' != '' then
            select item_id into v_parent_id from temp_category_map where category_name = item->>'parent_category_name';
            if v_parent_id is not null then
                update public.inventory_turnover_report_items set parent_category_id = v_parent_id
                where report_id = v_report_id and category_name = item->>'category_name';
            end if;
        end if;
    end loop;

    return v_report_id;
end;
$$;

-- Plan-Fact
create or replace function public.upsert_plan_fact_report(p_organization_name text, p_report_date date, p_report_items jsonb)
returns uuid language plpgsql security definer as $$
declare
    v_organization_id uuid;
    v_report_id uuid;
    item jsonb;
    v_item_id uuid;
    v_parent_id uuid;
begin
    insert into public.organizations (name) values (p_organization_name)
    on conflict (name) do update set name = excluded.name
    returning id into v_organization_id;

    insert into public.report_metadata (organization_id, report_type, report_date, updated_at)
    values (v_organization_id, 'plan_fact', p_report_date, now())
    on conflict (organization_id, report_type, report_date) do update set updated_at = now()
    returning id into v_report_id;

    delete from public.plan_fact_reports_items where report_id = v_report_id;

    create temp table temp_category_map (category_name text primary key, item_id uuid not null) on commit drop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        insert into public.plan_fact_reports_items (
            report_id, category_name, plan_amount, fact_amount, execution_percent,
            is_total_row, period_type, level, is_expandable
        ) values (
            v_report_id, item->>'category_name', (item->>'plan_amount')::decimal, (item->>'fact_amount')::decimal,
            (item->>'execution_percent')::decimal, (item->>'is_total_row')::boolean, item->>'period_type',
            (item->>'level')::integer, (item->>'is_expandable')::boolean
        ) returning id into v_item_id;

        insert into temp_category_map (category_name, item_id) values (item->>'category_name', v_item_id);
    end loop;

    for item in select * from jsonb_array_elements(p_report_items) loop
        if item->>'parent_category_name' is not null and item->>'parent_category_name' != '' then
            select item_id into v_parent_id from temp_category_map where category_name = item->>'parent_category_name';
            if v_parent_id is not null then
                update public.plan_fact_reports_items set parent_id = v_parent_id
                where report_id = v_report_id and category_name = item->>'category_name';
            end if;
        end if;
    end loop;

    return v_report_id;
end;
$$;
