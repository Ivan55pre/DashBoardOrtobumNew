/*
  # Создание таблицы для отчета по остаткам на РС и кассе

  1. Новые таблицы
    - `cash_bank_reports`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `organization_name` (text)
      - `account_name` (text) - название счета/кассы
      - `parent_organization_id` (uuid, self-reference)
      - `balance_start` (decimal) - остаток на начало предыдущего рабочего дня
      - `income_amount` (decimal) - приход за предыдущий рабочий день
      - `expense_amount` (decimal) - расход за предыдущий рабочий день
      - `balance_current` (decimal) - остаток на начало сегодняшнего дня
      - `account_type` (text) - тип счета (bank, cash, total, organization)
      - `level` (integer) - уровень иерархии
      - `is_total_row` (boolean) - является ли строка итоговой
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включен RLS для таблицы `cash_bank_reports`
    - Политики для аутентифицированных пользователей
*/

CREATE TABLE IF NOT EXISTS cash_bank_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date DEFAULT CURRENT_DATE,
  organization_name text NOT NULL,
  account_name text NOT NULL,
  parent_organization_id uuid REFERENCES cash_bank_reports(id) ON DELETE CASCADE,
  balance_start decimal(12,2) DEFAULT 0,
  income_amount decimal(12,2) DEFAULT 0,
  expense_amount decimal(12,2) DEFAULT 0,
  balance_current decimal(12,2) DEFAULT 0,
  account_type text DEFAULT 'bank' CHECK (account_type IN ('bank', 'cash', 'total', 'organization')),
  level integer DEFAULT 0,
  is_total_row boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE cash_bank_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
-- было
--CREATE POLICY "Users can manage own cash bank reports"
-- ON cash_bank_reports
--FOR ALL
--  TO authenticated
--  USING (auth.uid() = user_id)
--  WITH CHECK (auth.uid() = user_id);
-- стало  
  CREATE POLICY "Users can manage all cash bank reports"
  ON cash_bank_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_cash_bank_reports_date ON cash_bank_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_cash_bank_reports_parent ON cash_bank_reports(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_bank_reports_level ON cash_bank_reports(level);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_cash_bank_reports_updated_at 
  BEFORE UPDATE ON cash_bank_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
