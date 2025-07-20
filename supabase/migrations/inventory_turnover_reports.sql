/*
  # Создание таблицы для отчета по товарным запасам и оборачиваемости

  1. Новые таблицы
    - `inventory_turnover_reports`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `organization_name` (text)
      - `category_name` (text)
      - `parent_category_id` (uuid, self-reference)
      - `quantity_pairs` (integer)
      - `balance_rub` (decimal)
      - `dynamics_start_month_rub` (decimal)
      - `dynamics_start_month_percent` (decimal)
      - `dynamics_start_year_rub` (decimal)
      - `dynamics_start_year_percent` (decimal)
      - `turnover_days` (integer)
      - `level` (integer) - для иерархии категорий
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включен RLS для таблицы `inventory_turnover_reports`
    - Политики для аутентифицированных пользователей
*/

CREATE TABLE IF NOT EXISTS inventory_turnover_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date DEFAULT CURRENT_DATE,
  organization_name text NOT NULL,
  category_name text NOT NULL,
  parent_category_id uuid REFERENCES inventory_turnover_reports(id) ON DELETE CASCADE,
  quantity_pairs integer DEFAULT 0,
  balance_rub decimal(12,2) DEFAULT 0,
  dynamics_start_month_rub decimal(12,2) DEFAULT 0,
  dynamics_start_month_percent decimal(5,2) DEFAULT 0,
  dynamics_start_year_rub decimal(12,2) DEFAULT 0,
  dynamics_start_year_percent decimal(5,2) DEFAULT 0,
  turnover_days integer DEFAULT 0,
  level integer DEFAULT 0,
  is_total_row boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE inventory_turnover_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can manage own inventory turnover reports"
  ON inventory_turnover_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_date ON inventory_turnover_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_parent ON inventory_turnover_reports(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_level ON inventory_turnover_reports(level);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_inventory_turnover_updated_at 
  BEFORE UPDATE ON inventory_turnover_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
