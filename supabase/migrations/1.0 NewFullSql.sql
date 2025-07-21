-- Enable vector extension if not already enabled
create extension if not exists vector;

-- Create organizations table
create table organizations (
  id uuid primary key default gen_random_uuid (),
  name TEXT NOT NULL UNIQUE,  -- Вот это ключевое
  external_id text unique
);


-- Функция для проверки, является ли пользователь последним администратором в организации.
-- Это критически важно для предотвращения ситуаций, когда организация остается без администратора.
CREATE OR REPLACE FUNCTION public.is_last_admin_in_organization(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
-- SECURITY DEFINER нужен, чтобы функция могла видеть всех членов организации,
-- даже если у вызывающего пользователя нет на это прав по RLS.
-- Это безопасно, так как функция возвращает только boolean значение.
SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
    is_user_an_admin BOOLEAN;
BEGIN
    -- Проверяем, является ли указанный пользователь администратором в этой организации
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role = 'admin'
    ) INTO is_user_an_admin;

    IF NOT is_user_an_admin THEN
        RETURN FALSE; -- Если он не админ, он не может быть последним админом.
    END IF;

    -- Считаем общее количество администраторов в организации
    SELECT count(*) INTO admin_count FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.role = 'admin';

    -- Если количество администраторов равно 1, значит, это наш пользователь.
    RETURN admin_count = 1;
END;
$$;


-- Вспомогательные функции для RLS, чтобы избежать бесконечной рекурсии

-- Функция для проверки, является ли пользователь членом организации.
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_member_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id
  );
$$;

-- Функция для проверки, является ли пользователь администратором организации.
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_admin_of(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role = 'admin'
  );
$$;

-- Функция для проверки, пуста ли организация (нет ли в ней участников).
-- SECURITY DEFINER используется для обхода RLS вызывающего пользователя.
CREATE OR REPLACE FUNCTION public.is_organization_empty(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = p_organization_id);
$$;


-- Plan-fact reports items table
create table plan_fact_reports_items (
  id uuid primary key default gen_random_uuid (),
  report_id uuid references report_metadata (id) on delete cascade,
  plan_amount numeric not null,
  fact_amount numeric not null,
  execution_percent numeric not null,
  is_total_row boolean not null,
  created_at timestamptz default now() not null
);

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

-- Function and trigger for plan-fact reports items timestamp
create or replace function public.update_plan_fact_reports_items_timestamp () returns trigger as $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

create trigger update_plan_fact_reports_items_timestamp before
update on plan_fact_reports_items for each row
execute function public.update_plan_fact_reports_items_timestamp ();

-- Debt reports items table
create table debt_reports_items (
  id uuid primary key default gen_random_uuid (),
  report_id uuid references report_metadata (id) on delete cascade,
  debt_amount numeric not null,
  overdue_amount numeric not null,
  credit_amount numeric not null,
  is_total_row boolean not null,
  client_name text not null,
  parent_client_id uuid references debt_reports_items (id) on delete set null,
  created_at timestamptz default now(),
  level int
);

-- Function and trigger for debt reports items timestamp
create or replace function public.update_debt_reports_items_timestamp () returns trigger as $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

create trigger update_debt_reports_items_timestamp before
update on debt_reports_items for each row
execute function public.update_debt_reports_items_timestamp ();

-- Indexes for debt_reports_items
create index idx_debt_reports_items_report_id on debt_reports_items using btree (report_id);
create index idx_debt_reports_items_client_name on debt_reports_items using btree (client_name);
create index idx_debt_reports_items_parent_client_id on debt_reports_items using btree (parent_client_id);
create index idx_debt_reports_items_level on debt_reports_items using btree (level);

-- Debt monthly summaries table
create table debt_monthly_summaries (
  organization_id uuid references organizations (id) on delete cascade,
  year int not null,
  month int not null,
  client_name text not null,
  total_debt numeric not null,
  total_overdue numeric not null,
  total_credit numeric not null,
  primary key (organization_id, year, month, client_name)
);

-- Plan-fact monthly summaries table
create table plan_fact_monthly_summaries (
  organization_id uuid references organizations (id) on delete cascade,
  year int not null,
  month int not null,
  category_name text not null,
  total_plan numeric not null,
  total_fact numeric not null,
  execution_percent numeric not null,
  primary key (organization_id, year, month, category_name)
);

-- 1.0 create tabl RAG.sql
-- в первом node
-- Включите расширение pgvector (если ещё не включено)
CREATE EXTENSION IF NOT EXISTS vector;

-- Создайте таблицу для документов (если её нет)
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  metadata JSONB,
  embedding VECTOR(1024)  -- Размерность для Mistral
);

-- Функция поиска (обновите размерность до 1024)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1024),
  match_count INT DEFAULT NULL,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) LANGUAGE SQL AS $$
  SELECT 
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- 2 node
CREATE TABLE document_metadata (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    schema TEXT
);

-- node 3
CREATE TABLE document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id TEXT REFERENCES document_metadata(id),
    row_data JSONB  -- Store the actual row data
);

-- 1.1 n8n_chat_histories.sql
-- Создайте таблицу для пользователей (если её нет)
CREATE TABLE IF NOT EXISTS UsersBot (
  user_id BIGINT PRIMARY KEY, -- обязательный Telegram-ID
  user_name TEXT,
  user_pass TEXT,
  user_secret TEXT,  
  user_format TEXT,  
  is_subscribed  BOOLEAN  DEFAULT FALSE         -- есть ли подписка (по умолчанию — false)
  );

-- Сначала создаём последовательность
CREATE SEQUENCE IF NOT EXISTS n8n_chat_histories_id_seq;

-- Затем таблицу
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id INTEGER NOT NULL DEFAULT nextval('n8n_chat_histories_id_seq'::regclass),
  session_id VARCHAR NOT NULL,
  message JSONB NOT NULL,
  CONSTRAINT n8n_chat_histories_pkey PRIMARY KEY (id)
);

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

-- 1.5.1 auto_set_first_admin_trigger
-- Функция-триггер, которая будет назначать первого пользователя в организации администратором.
CREATE OR REPLACE FUNCTION public.set_first_member_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY DEFINER позволяет функции выполняться с правами создателя (обычно superuser),
-- обходя RLS. Это необходимо, чтобы обновить роль, даже если у пользователя,
-- вызвавшего INSERT, нет прав на UPDATE.
SECURITY DEFINER
AS $$
DECLARE
    member_count INTEGER;
BEGIN
    -- Считаем количество участников в организации, к которой добавляется новый пользователь.
    SELECT count(*)
    INTO member_count
    FROM public.organization_members
    WHERE organization_id = NEW.organization_id;

    -- Если это первый участник (count = 1), то назначаем ему роль 'admin'.
    IF member_count = 1 THEN
        UPDATE public.organization_members
        SET role = 'admin'
        WHERE id = NEW.id; -- Обновляем конкретно ту строку, которая была вставлена.
    END IF;

    RETURN NEW;
END;
$$;

-- Создаем триггер, который вызывает функцию после каждой вставки в organization_members.
CREATE TRIGGER on_new_member_set_admin_role
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.set_first_member_as_admin();

-- 1.7 report_metadata
CREATE TABLE report_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,  -- 'cash_bank' или 'inventory_turnover'
    report_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE (organization_id, report_type, report_date)
);

-- Function and trigger for report_metadata timestamp
create or replace function update_report_metadata_timestamp () returns trigger as $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

create trigger update_report_metadata_timestamp before
update on report_metadata for each row
execute function update_report_metadata_timestamp ();

-- Включаем Row-Level Security для таблицы
ALTER TABLE report_metadata ENABLE ROW LEVEL SECURITY;

-- Политика: Разрешить чтение метаданных отчета только членам соответствующей организации.
CREATE POLICY "Allow members to read their organization's report metadata"
ON report_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = report_metadata.organization_id
      AND organization_members.user_id = auth.uid()
  )
);

-- Политика INSERT: Разрешить администраторам организации создавать метаданные отчета.
CREATE POLICY "Allow admins to insert report metadata"
ON report_metadata FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = report_metadata.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- Политика UPDATE: Разрешить администраторам организации обновлять метаданные отчета.
CREATE POLICY "Allow admins to update report metadata"
ON report_metadata FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = report_metadata.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- Политика DELETE: Разрешить администраторам организации удалять метаданные отчета.
CREATE POLICY "Allow admins to delete report metadata"
ON report_metadata FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = report_metadata.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- 1.8 cash_bank_report_items
-- Для денежных остатков
CREATE TABLE cash_bank_report_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_metadata(id) ON DELETE CASCADE,
    subconto TEXT,
    account_name TEXT NOT NULL,
    balance_start DECIMAL(15,2),
    income_amount DECIMAL(15,2),
    expense_amount DECIMAL(15,2),
    balance_current DECIMAL(15,2),
    account_type TEXT CHECK (account_type IN ('bank', 'cash', 'total')),
    level INTEGER,
    currency text not null,
    is_total_row BOOLEAN DEFAULT false,
	created_at timestamptz default now() not null
);

-- Function and trigger for cash bank report items timestamp
create or replace function update_cash_bank_report_items_timestamp () returns trigger as $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

create trigger update_cash_bank_report_items_timestamp before
update on cash_bank_report_items for each row
execute function update_cash_bank_report_items_timestamp ();


-- Включаем RLS для таблицы
ALTER TABLE cash_bank_report_items ENABLE ROW LEVEL SECURITY;

-- Политика: Разрешить чтение строк отчета только членам соответствующей организации.
-- Проверка происходит через связь с report_metadata.
CREATE POLICY "Allow members to read their organization's cash/bank items"
ON cash_bank_report_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = cash_bank_report_items.report_id
      AND om.user_id = auth.uid()
  )
);

-- Политика INSERT: Разрешить администраторам организации добавлять строки отчета.
CREATE POLICY "Allow admins to insert cash/bank items"
ON cash_bank_report_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = cash_bank_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Политика UPDATE: Разрешить администраторам организации обновлять строки отчета.
CREATE POLICY "Allow admins to update cash/bank items"
ON cash_bank_report_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = cash_bank_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Политика DELETE: Разрешить администраторам организации удалять строки отчета.
CREATE POLICY "Allow admins to delete cash/bank items"
ON cash_bank_report_items FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = cash_bank_report_items.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);




CREATE TABLE cash_bank_monthly_summaries (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    account_type TEXT NOT NULL,
    avg_balance DECIMAL(15,2),
    total_income DECIMAL(15,2),
    total_expense DECIMAL(15,2),
    PRIMARY KEY (organization_id, year, month, account_type)
);

-- Включаем RLS для таблицы сводных данных
ALTER TABLE cash_bank_monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Политика: Разрешить чтение сводных данных только членам соответствующей организации.
CREATE POLICY "Allow members to read their organization's monthly summaries"
ON cash_bank_monthly_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = cash_bank_monthly_summaries.organization_id
      AND organization_members.user_id = auth.uid()
  )
);

-- 1.9 create_upsert_report_function
-- Функция для атомарной загрузки/обновления отчета по остаткам.
-- Она находит или создает организацию, создает метаданные отчета и загружает данные.
-- Идеально подходит для вызова из внешних систем, таких как n8n.
CREATE OR REPLACE FUNCTION public.upsert_cash_bank_report(
    p_organization_name TEXT,
    p_report_date DATE,
    p_report_items JSONB
)
RETURNS UUID -- Возвращаем ID созданного отчета для подтверждения
LANGUAGE plpgsql
-- Выполняется с правами владельца, чтобы обойти RLS для системной операции
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_report_id UUID;
    item JSONB;
BEGIN
    -- Шаг 1: Найти или создать организацию по имени.
    -- ON CONFLICT гарантирует, что мы не создадим дубликат.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name -- Это действие нужно для RETURNING, даже если имя не меняется
    RETURNING id INTO v_organization_id;

    -- Шаг 2: Найти или создать метаданные отчета.
    -- Если отчет за эту дату уже существует, мы просто получим его ID и обновим дату.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'cash_bank', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Шаг 3: (Рекомендуется) Удалить старые данные для этого отчета,
    -- чтобы избежать дубликатов при повторной загрузке.
    DELETE FROM public.cash_bank_report_items WHERE report_id = v_report_id;

    -- Шаг 4: Вставить новые строки отчета из JSON-массива.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        INSERT INTO public.cash_bank_report_items (report_id, account_name, subconto, balance_start, income_amount, expense_amount, balance_current, account_type, level,currency, is_total_row)
        VALUES (v_report_id, item->>'account_name', item->>'subconto', (item->>'balance_start')::DECIMAL, (item->>'income_amount')::DECIMAL, (item->>'expense_amount')::DECIMAL, (item->>'balance_current')::DECIMAL, item->>'account_type', (item->>'level')::INTEGER, item->>'currency', (item->>'is_total_row')::BOOLEAN);
    END LOOP;

    -- Возвращаем ID созданного или обновленного отчета для подтверждения.
    RETURN v_report_id;
END;
$$;

-- 1.10 inventory_turnover_report_items
-- Для товарных запасов
CREATE TABLE inventory_turnover_report_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_metadata(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    parent_category_id UUID REFERENCES inventory_turnover_report_items(id) ON DELETE SET NULL,
    quantity_pairs INTEGER,
    balance_rub DECIMAL(15,2),
    dynamics_start_month_rub DECIMAL(15,2),
    dynamics_start_month_percent DECIMAL(5,2),
    dynamics_start_year_rub DECIMAL(15,2),
    dynamics_start_year_percent DECIMAL(5,2),
    turnover_days INTEGER,
    level INTEGER
);

-- Включаем RLS для таблицы
ALTER TABLE inventory_turnover_report_items ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Разрешить членам организации читать строки отчета по товарам.
CREATE POLICY "Allow members to read their organization's inventory items"
ON inventory_turnover_report_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
  )
);

-- Политика INSERT: Разрешить администраторам организации добавлять строки отчета по товарам.
CREATE POLICY "Allow admins to insert inventory items"
ON inventory_turnover_report_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.role = 'admin'
  )
);

-- Политика UPDATE: Разрешить администраторам организации обновлять строки отчета по товарам.
CREATE POLICY "Allow admins to update inventory items"
ON inventory_turnover_report_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.role = 'admin'
  )
);

-- Политика DELETE: Разрешить администраторам организации удалять строки отчета по товарам.
CREATE POLICY "Allow admins to delete inventory items"
ON inventory_turnover_report_items FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM report_metadata rm
    JOIN organization_members om ON rm.organization_id = om.organization_id
    WHERE rm.id = inventory_turnover_report_items.report_id
      AND om.role = 'admin'
  )
);


CREATE TABLE inventory_monthly_summaries (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    category_path TEXT,  -- Путь в иерархии категорий (например, 'clothing/shoes')
    avg_balance_rub DECIMAL(15,2),
    avg_turnover_days INTEGER,
    PRIMARY KEY (organization_id, year, month, category_path)
);

-- Включаем RLS для таблицы сводных данных по товарам
ALTER TABLE inventory_monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Разрешить членам организации читать сводные данные по товарам.
CREATE POLICY "Allow members to read their organization's inventory summaries"
ON inventory_monthly_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = inventory_monthly_summaries.organization_id
      AND organization_members.user_id = auth.uid()
  )
);

-- Политика INSERT: Разрешить администраторам организации создавать сводные данные по товарам.
CREATE POLICY "Allow admins to insert inventory summaries"
ON inventory_monthly_summaries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = inventory_monthly_summaries.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- Политика UPDATE: Разрешить администраторам организации обновлять сводные данные по товарам.
CREATE POLICY "Allow admins to update inventory summaries"
ON inventory_monthly_summaries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = inventory_monthly_summaries.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- Политика DELETE: Разрешить администраторам организации удалять сводные данные по товарам.
CREATE POLICY "Allow admins to delete inventory summaries"
ON inventory_monthly_summaries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = inventory_monthly_summaries.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
  )
);

-- 1.11 create_upsert_inventory_report_function
-- Функция для атомарной загрузки/обновления отчета по товарным запасам.
-- Она находит или создает организацию, метаданные отчета и иерархически загружает данные.
-- Идеально подходит для вызова из внешних систем, таких как n8n.
CREATE OR REPLACE FUNCTION public.upsert_inventory_turnover_report(
    p_organization_name TEXT,
    p_report_date DATE,
    p_report_items JSONB
)
RETURNS UUID -- Возвращаем ID созданного отчета для подтверждения
LANGUAGE plpgsql
-- Выполняется с правами владельца, чтобы обойти RLS для системной операции
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_report_id UUID;
    item JSONB;
    v_item_id UUID;
    v_parent_id UUID;
BEGIN
    -- Шаг 1: Найти или создать организацию по имени.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO v_organization_id;

    -- Шаг 2: Найти или создать метаданные отчета.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'inventory_turnover', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Шаг 3: Удалить старые данные для этого отчета.
    DELETE FROM public.inventory_turnover_report_items WHERE report_id = v_report_id;

    -- Шаг 4: Вставить новые строки отчета, обрабатывая иерархию.
    -- Создаем временную таблицу для сопоставления имен категорий с их новыми UUID.
    CREATE TEMP TABLE temp_category_map (
        category_name TEXT PRIMARY KEY,
        item_id UUID NOT NULL
    ) ON COMMIT DROP;

    -- Первый проход: вставляем все элементы с NULL в parent_category_id и заполняем карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        INSERT INTO public.inventory_turnover_report_items (report_id, category_name, quantity_pairs, balance_rub, dynamics_start_month_rub, dynamics_start_month_percent, dynamics_start_year_rub, dynamics_start_year_percent, turnover_days, level)
        VALUES (v_report_id, item->>'category_name', (item->>'quantity_pairs')::INTEGER, (item->>'balance_rub')::DECIMAL, (item->>'dynamics_start_month_rub')::DECIMAL, (item->>'dynamics_start_month_percent')::DECIMAL, (item->>'dynamics_start_year_rub')::DECIMAL, (item->>'dynamics_start_year_percent')::DECIMAL, (item->>'turnover_days')::INTEGER, (item->>'level')::INTEGER)
        RETURNING id INTO v_item_id;

        INSERT INTO temp_category_map (category_name, item_id) VALUES (item->>'category_name', v_item_id);
    END LOOP;

    -- Второй проход: обновляем parent_category_id, используя карту.
    -- Предполагается, что в JSON есть поле 'parent_category_name'.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items)
    LOOP
        IF item->>'parent_category_name' IS NOT NULL AND item->>'parent_category_name' != '' THEN
            SELECT item_id INTO v_parent_id FROM temp_category_map WHERE category_name = item->>'parent_category_name';
            IF v_parent_id IS NOT NULL THEN
                UPDATE public.inventory_turnover_report_items SET parent_category_id = v_parent_id
                WHERE report_id = v_report_id AND category_name = item->>'category_name';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;

-- Функция для атомарной загрузки/обновления отчета "План-факт".
-- Аналогична другим upsert-функциям, обрабатывает иерархию.
CREATE OR REPLACE FUNCTION public.upsert_plan_fact_report(
    p_organization_name TEXT,
    p_report_date DATE,
    p_report_items JSONB
)
RETURNS UUID -- Возвращаем ID созданного отчета для подтверждения
LANGUAGE plpgsql
-- Выполняется с правами владельца, чтобы обойти RLS для системной операции
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_report_id UUID;
    item JSONB;
    v_item_id UUID;
    v_parent_id UUID;
BEGIN
    -- Шаг 1: Найти или создать организацию по имени.
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    ON CONFLICT (name) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO v_organization_id;

    -- Шаг 2: Найти или создать метаданные отчета.
    INSERT INTO public.report_metadata (organization_id, report_type, report_date, updated_at)
    VALUES (v_organization_id, 'plan_fact', p_report_date, NOW())
    ON CONFLICT (organization_id, report_type, report_date) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Шаг 3: Удалить старые данные для этого отчета.
    DELETE FROM public.plan_fact_reports_items WHERE report_id = v_report_id;

    -- Шаг 4: Вставить новые строки отчета, обрабатывая иерархию.
    CREATE TEMP TABLE temp_category_map (category_name TEXT PRIMARY KEY, item_id UUID NOT NULL) ON COMMIT DROP;

    -- Первый проход: вставляем все элементы с NULL в parent_id и заполняем карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        INSERT INTO public.plan_fact_reports_items (report_id, category_name, plan_amount, fact_amount, execution_percent, is_total_row, period_type, level, is_expandable)
        VALUES (v_report_id, item->>'category_name', (item->>'plan_amount')::DECIMAL, (item->>'fact_amount')::DECIMAL, (item->>'execution_percent')::DECIMAL, (item->>'is_total_row')::BOOLEAN, item->>'period_type', (item->>'level')::INTEGER, (item->>'is_expandable')::BOOLEAN)
        RETURNING id INTO v_item_id;

        INSERT INTO temp_category_map (category_name, item_id) VALUES (item->>'category_name', v_item_id);
    END LOOP;

    -- Второй проход: обновляем parent_id, используя карту.
    FOR item IN SELECT * FROM jsonb_array_elements(p_report_items) LOOP
        IF item->>'parent_category_name' IS NOT NULL AND item->>'parent_category_name' != '' THEN
            SELECT item_id INTO v_parent_id FROM temp_category_map WHERE category_name = item->>'parent_category_name';
            IF v_parent_id IS NOT NULL THEN
                UPDATE public.plan_fact_reports_items SET parent_id = v_parent_id WHERE report_id = v_report_id AND category_name = item->>'category_name';
            END IF;
        END IF;
    END LOOP;

    RETURN v_report_id;
END;
$$;

-- 1.12 get_cash_bank_dashboard
CREATE OR REPLACE FUNCTION get_cash_bank_dashboard(
    p_organization_id UUID,
    p_report_date DATE
)
RETURNS TABLE (
    organization_name TEXT,
    report_date DATE,
    account_name TEXT,
    balance_current DECIMAL(15,2),
    account_type TEXT,
    level INTEGER,
    is_total_row BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    -- Проверка безопасности: убеждаемся, что вызывающий пользователь (auth.uid())
    -- является членом организации, для которой запрашиваются данные.
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = p_organization_id
          AND om.user_id = auth.uid()
    ) INTO is_member;

    -- Если пользователь не является членом организации, возвращаем пустой результат.
    -- Это безопаснее, чем вызывать ошибку, так как не раскрывает информацию.
    IF NOT is_member THEN
        RETURN;
    END IF;

    -- Если проверка пройдена, выполняем основной запрос
    RETURN QUERY
    SELECT
        o.name,
        rm.report_date,
        cbri.account_name,
        cbri.balance_current,
        cbri.account_type,
        cbri.level,
        cbri.is_total_row
    FROM cash_bank_report_items AS cbri
    JOIN report_metadata AS rm ON cbri.report_id = rm.id
    JOIN organizations AS o ON rm.organization_id = o.id
    WHERE rm.organization_id = p_organization_id
      AND rm.report_date = p_report_date
      AND rm.report_type = 'cash_bank'
    ORDER BY
        cbri.level, cbri.account_name;
END;
$$;

-- 2.1 update_cash_bank_monthly_summary
CREATE OR REPLACE FUNCTION update_cash_bank_monthly_summary()
RETURNS TRIGGER AS $$
DECLARE
    report_org_id UUID;
    report_date DATE;
BEGIN
    -- Получаем organization_id и дату отчета из связанной таблицы report_metadata
    SELECT rm.organization_id, rm.report_date 
    INTO report_org_id, report_date
    FROM report_metadata rm
    WHERE rm.id = COALESCE(NEW.report_id, OLD.report_id);
    
    IF report_org_id IS NULL OR report_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Обновляем сводные данные для каждого типа счета
    INSERT INTO cash_bank_monthly_summaries (
        organization_id,
        year,
        month,
        account_type,
        avg_balance,
        total_income,
        total_expense
    )
    SELECT 
        report_org_id,
        EXTRACT(YEAR FROM report_date)::INTEGER,
        EXTRACT(MONTH FROM report_date)::INTEGER,
        cbr.account_type,
        AVG(cbr.balance_current) AS avg_balance,
        SUM(cbr.income_amount) AS total_income,
        SUM(cbr.expense_amount) AS total_expense
    FROM cash_bank_report_items cbr
    WHERE cbr.report_id = COALESCE(NEW.report_id, OLD.report_id)
      AND cbr.is_total_row = FALSE -- Исключаем итоговые строки
    GROUP BY cbr.account_type
    
    ON CONFLICT (organization_id, year, month, account_type) 
    DO UPDATE SET
        avg_balance = EXCLUDED.avg_balance,
        total_income = EXCLUDED.total_income,
        total_expense = EXCLUDED.total_expense;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для вставки и обновления записей
CREATE TRIGGER trg_cash_bank_report_items_upsert
AFTER INSERT OR UPDATE ON cash_bank_report_items
FOR EACH ROW
EXECUTE FUNCTION update_cash_bank_monthly_summary();

-- Триггер для удаления записей (чтобы пересчитать агрегаты)
CREATE TRIGGER trg_cash_bank_report_items_delete
AFTER DELETE ON cash_bank_report_items
FOR EACH ROW
EXECUTE FUNCTION update_cash_bank_monthly_summary();

-- 2.2 refresh_monthly_summaries
CREATE OR REPLACE FUNCTION refresh_monthly_summaries()
RETURNS VOID AS $$
BEGIN
    -- Очищаем старые данные (или можно делать более интеллектуальное обновление)
    TRUNCATE cash_bank_monthly_summaries;
    
    -- Пересчитываем все агрегированные данные
    INSERT INTO cash_bank_monthly_summaries (
        organization_id,
        year,
        month,
        account_type,
        avg_balance,
        total_income,
        total_expense
    )
    SELECT 
        rm.organization_id,
        EXTRACT(YEAR FROM rm.report_date)::INTEGER,
        EXTRACT(MONTH FROM rm.report_date)::INTEGER,
        cbr.account_type,
        AVG(cbr.balance_current),
        SUM(cbr.income_amount),
        SUM(cbr.expense_amount)
    FROM cash_bank_report_items cbr
    JOIN report_metadata rm ON rm.id = cbr.report_id
    WHERE cbr.is_total_row = FALSE
    GROUP BY 
        rm.organization_id,
        EXTRACT(YEAR FROM rm.report_date),
        EXTRACT(MONTH FROM rm.report_date),
        cbr.account_type;
END;
$$ LANGUAGE plpgsql;

-- Можно настроить ежедневное выполнение через pgAgent или другой планировщик

-- 2.3 update_monthly_summaries_for_period
CREATE OR REPLACE FUNCTION update_monthly_summaries_for_period(
    p_organization_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Удаляем старые данные за период
    DELETE FROM cash_bank_monthly_summaries
    WHERE organization_id = p_organization_id
      AND year = p_year
      AND month = p_month;
    
    -- Вставляем новые агрегированные данные
    INSERT INTO cash_bank_monthly_summaries (
        organization_id,
        year,
        month,
        account_type,
        avg_balance,
        total_income,
        total_expense
    )
    SELECT 
        p_organization_id,
        p_year,
        p_month,
        account_type,
        AVG(balance_current),
        SUM(income_amount),
        SUM(expense_amount)
    FROM cash_bank_report_items cbr
    JOIN report_metadata rm ON rm.id = cbr.report_id
    WHERE rm.organization_id = p_organization_id
      AND EXTRACT(YEAR FROM rm.report_date) = p_year
      AND EXTRACT(MONTH FROM rm.report_date) = p_month
      AND cbr.is_total_row = FALSE
    GROUP BY account_type;
END;
$$ LANGUAGE plpgsql;

-- 4. Новые функции для управления организациями

-- Функция для получения списка членов организации вместе с их email.
-- Необходима, так как клиентское приложение не может напрямую соединять
-- таблицу `organization_members` с `auth.users` из-за RLS.
CREATE OR REPLACE FUNCTION public.get_organization_members(p_organization_id UUID)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    organization_id UUID,
    role TEXT,
    email TEXT
)
LANGUAGE plpgsql
-- SECURITY DEFINER необходим для доступа к auth.users.
-- Это безопасно, так как мы сначала проверяем, является ли вызывающий пользователь
-- членом организации, для которой запрашиваются данные.
SECURITY DEFINER
AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    -- Проверка безопасности: Убеждаемся, что вызывающий пользователь (auth.uid())
    -- является членом организации.
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = p_organization_id
          AND om.user_id = auth.uid()
    ) INTO is_member;

    IF NOT is_member THEN
        RAISE EXCEPTION 'Access denied: You are not a member of this organization.';
    END IF;

    -- Если проверка пройдена, возвращаем список участников с их email.
    RETURN QUERY
    SELECT
        om.id,
        om.user_id,
        om.organization_id,
        om.role,
        u.email
    FROM public.organization_members om
    JOIN auth.users u ON om.user_id = u.id
    WHERE om.organization_id = p_organization_id
    ORDER BY u.email;
END;
$$;

-- Функция для приглашения пользователя в организацию по email.
-- Должна вызываться администратором организации.
CREATE OR REPLACE FUNCTION public.invite_user_to_organization(
    p_organization_id UUID,
    p_invitee_email TEXT
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER, чтобы RLS-политики на вставку в organization_members сработали.
-- Это гарантирует, что только администратор может добавить нового участника.
SECURITY INVOKER
AS $$
DECLARE
    v_invitee_user_id UUID;
BEGIN
    -- Находим ID пользователя по email. Требует прав суперпользователя, поэтому лучше вынести в Edge Function в будущем.
    -- Для простоты пока предполагаем, что это будет работать.
    SELECT id INTO v_invitee_user_id FROM auth.users WHERE email = p_invitee_email;

    IF v_invitee_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please ask them to sign up first.', p_invitee_email;
    END IF;

    -- Вставляем нового участника. RLS-политика на INSERT проверит, является ли вызывающий пользователь админом.
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_organization_id, v_invitee_user_id, 'member');
END;
$$;

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

-- 20.07.25
-- ограничение уникальности
ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);