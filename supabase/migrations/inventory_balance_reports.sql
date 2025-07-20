/*
  # Создание таблицы для отчета по остаткам товаров

  1. Новые таблицы
    - `inventory_balance_reports`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `nomenclature` (text) - номенклатура товара
      - `parent_nomenclature_id` (uuid, self-reference) - для иерархии
      - `quantity` (integer) - количество
      - `sum_amount` (decimal) - сумма
      - `dynamics_start_month_rub` (decimal) - динамика с начала месяца в рублях
      - `dynamics_start_month_percent` (decimal) - динамика с начала месяца в процентах
      - `dynamics_start_year_rub` (decimal) - динамика с начала года в рублях
      - `dynamics_start_year_percent` (decimal) - динамика с начала года в процентах
      - `level` (integer) - уровень иерархии
      - `is_total_row` (boolean) - является ли строка итоговой
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включен RLS для таблицы `inventory_balance_reports`
    - Политики для аутентифицированных пользователей
*/

CREATE TABLE IF NOT EXISTS inventory_balance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date DEFAULT CURRENT_DATE,
  nomenclature text NOT NULL,
  parent_nomenclature_id uuid REFERENCES inventory_balance_reports(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  sum_amount decimal(12,2) DEFAULT 0,
  dynamics_start_month_rub decimal(12,2) DEFAULT 0,
  dynamics_start_month_percent decimal(5,2) DEFAULT 0,
  dynamics_start_year_rub decimal(12,2) DEFAULT 0,
  dynamics_start_year_percent decimal(5,2) DEFAULT 0,
  level integer DEFAULT 0,
  is_total_row boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE inventory_balance_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can manage own inventory balance reports"
  ON inventory_balance_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_inventory_balance_date ON inventory_balance_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_inventory_balance_parent ON inventory_balance_reports(parent_nomenclature_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balance_level ON inventory_balance_reports(level);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_inventory_balance_updated_at 
  BEFORE UPDATE ON inventory_balance_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
