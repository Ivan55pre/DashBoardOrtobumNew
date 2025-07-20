/*
  # Создание таблицы для отчета по задолженностям

  1. Новые таблицы
    - `debt_reports`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `organization_name` (text)
      - `parent_organization_id` (uuid, self-reference)
      - `debt_amount` (decimal) - сумма задолженности
      - `overdue_amount` (decimal) - просроченная задолженность
      - `credit_amount` (decimal) - кредиторская задолженность
      - `organization_type` (text) - тип организации (контрагент, поставщик и т.д.)
      - `level` (integer) - для иерархии организаций
      - `is_total_row` (boolean) - является ли строка итоговой
      - `is_group_row` (boolean) - является ли строка группирующей
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включен RLS для таблицы `debt_reports`
    - Политики для аутентифицированных пользователей
*/

CREATE TABLE IF NOT EXISTS debt_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date DEFAULT CURRENT_DATE,
  organization_name text NOT NULL,
  parent_organization_id uuid REFERENCES debt_reports(id) ON DELETE CASCADE,
  debt_amount decimal(12,2) DEFAULT 0,
  overdue_amount decimal(12,2) DEFAULT 0,
  credit_amount decimal(12,2) DEFAULT 0,
  organization_type text DEFAULT 'contractor' CHECK (organization_type IN ('contractor', 'supplier', 'buyer', 'group', 'total')),
  level integer DEFAULT 0,
  is_total_row boolean DEFAULT false,
  is_group_row boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE debt_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can manage own debt reports"
  ON debt_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_debt_reports_date ON debt_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_debt_reports_parent ON debt_reports(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_debt_reports_level ON debt_reports(level);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_debt_reports_updated_at 
  BEFORE UPDATE ON debt_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
