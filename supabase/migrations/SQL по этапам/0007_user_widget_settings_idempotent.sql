-- =============================================================
-- 0007_user_widget_settings_idempotent.sql
-- Пользовательские настройки виджетов (видимость, порядок) + RLS и триггеры.
-- Идемпотентно и безопасно для повторных запусков.
-- =============================================================

-- 1) Таблица
create table if not exists public.user_widget_settings (
    user_id uuid not null references auth.users(id) on delete cascade,
    widget_id text not null,
    is_visible boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    widget_order int not null default 0,
    primary key (user_id, widget_id)
);

-- 2) Включаем RLS
alter table public.user_widget_settings enable row level security;

-- 3) Политика: пользователь управляет только своими записями
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can manage their own widget settings'
          AND schemaname = 'public'
          AND tablename = 'user_widget_settings'
    ) THEN
        CREATE POLICY "Users can manage their own widget settings"
        ON public.user_widget_settings
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 4) Триггер для updated_at
create or replace function public.handle_user_widget_settings_update()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists on_user_widget_settings_update on public.user_widget_settings;
create trigger on_user_widget_settings_update
before update on public.user_widget_settings
for each row
execute function public.handle_user_widget_settings_update();

-- 5) Функция: вернуть список виджетов с дефолтным порядком
create or replace function public.get_user_widget_settings()
returns table(widget_id text, is_visible boolean, widget_order int)
language plpgsql
as $$
declare
    v_user_id uuid := auth.uid();
begin
    -- Единый перечень доступных виджетов и их дефолтный порядок.
    return query
    with default_widgets (id, "order") as (
        values
            ('cash_bank', 0),
            ('debt', 1),
            ('plan_fact', 2),
            ('inventory', 3)
    )
    select
        dw.id,
        coalesce(uws.is_visible, true) as is_visible,
        coalesce(uws.widget_order, dw."order") as widget_order
    from default_widgets dw
    left join public.user_widget_settings uws
      on uws.widget_id = dw.id and uws.user_id = v_user_id
    order by widget_order;
end;
$$;

-- 6) Функция: сохранить порядок виджетов
create or replace function public.save_widget_order(p_widget_orders jsonb)
returns void
language plpgsql
as $$
declare
    widget_data jsonb;
    v_user_id uuid := auth.uid();
begin
    for widget_data in select * from jsonb_array_elements(p_widget_orders)
    loop
        insert into public.user_widget_settings (user_id, widget_id, widget_order)
        values (
            v_user_id,
            widget_data->>'widget_id',
            (widget_data->>'order')::int
        )
        on conflict (user_id, widget_id)
        do update set
            widget_order = excluded.widget_order,
            updated_at = now();
    end loop;
end;
$$;
