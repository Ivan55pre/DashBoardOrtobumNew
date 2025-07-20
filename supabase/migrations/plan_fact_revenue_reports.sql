/*
  # Создание таблицы для отчета План-факт выручки

  1. Новые таблицы
    - `plan_fact_revenue_reports`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `organization_name` (text)
      - `parent_organization_id` (uuid, self-reference)
      - `plan_amount` (decimal) - плановая сумма
      - `fact_amount` (decimal) - фактическая сумма
      - `execution_percent` (decimal) - процент выполнения плана
      - `period_type` (text) - тип периода (месяц/год)
      - `level` (integer) - для иерархии организаций
      - `is_total_row` (boolean) - является ли строка итоговой
      - `is_expandable` (boolean) - можно ли разворачивать строку
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включен RLS для таблицы `plan_fact_revenue_reports`
    - Политики для аутентифицированных пользователей
*/

CREATE TABLE IF NOT EXISTS plan_fact_revenue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date DEFAULT CURRENT_DATE,
  organization_name text NOT NULL,
  parent_organization_id uuid REFERENCES plan_fact_revenue_reports(id) ON DELETE CASCADE,
  plan_amount decimal(12,2) DEFAULT 0,
  fact_amount decimal(12,2) DEFAULT 0,
  execution_percent decimal(5,2) DEFAULT 0,
  period_type text DEFAULT 'month' CHECK (period_type IN ('month', 'year')),
  level integer DEFAULT 0,
  is_total_row boolean DEFAULT false,
  is_expandable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE plan_fact_revenue_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can manage own plan fact revenue reports"
  ON plan_fact_revenue_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_plan_fact_revenue_date ON plan_fact_revenue_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_plan_fact_revenue_parent ON plan_fact_revenue_reports(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_fact_revenue_level ON plan_fact_revenue_reports(level);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_plan_fact_revenue_updated_at 
  BEFORE UPDATE ON plan_fact_revenue_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
