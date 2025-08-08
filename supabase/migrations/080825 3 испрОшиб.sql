-- Этот скрипт исправляет отсутствующие foreign key constraints, вызывающие ошибки в отчетах.

BEGIN;

-- Шаг 1: Исправление foreign key в таблице 'inventory_turnover_report_items'.
-- Ошибка "Could not find a relationship..." указывает на отсутствующий foreign key.
-- Этот блок добавляет его, если он не существует.

-- Убедимся, что колонка `report_id` не может быть пустой (NOT NULL).
ALTER TABLE public.inventory_turnover_report_items
ALTER COLUMN report_id SET NOT NULL;

-- Добавим сам foreign key, если он отсутствует.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.inventory_turnover_report_items'::regclass
          AND con.contype = 'f'
          AND att.attname = 'report_id'
    ) THEN
        ALTER TABLE public.inventory_turnover_report_items
        ADD CONSTRAINT inventory_turnover_report_items_report_id_fkey
        FOREIGN KEY (report_id) REFERENCES public.report_metadata(id) ON DELETE CASCADE;
    END IF;
END;
$$;


-- Шаг 2: Превентивное исправление для таблицы 'plan_fact_reports_items'.
-- В этой таблице report_id был объявлен как nullable, что некорректно и может вызвать проблемы в будущем.
-- Приводим его в соответствие с другими таблицами отчетов.

-- Устанавливаем NOT NULL для report_id.
ALTER TABLE public.plan_fact_reports_items
ALTER COLUMN report_id SET NOT NULL;

-- Добавляем foreign key, если он отсутствует (на случай, если он тоже был пропущен).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.plan_fact_reports_items'::regclass
          AND con.contype = 'f'
          AND att.attname = 'report_id'
    ) THEN
        ALTER TABLE public.plan_fact_reports_items
        ADD CONSTRAINT plan_fact_reports_items_report_id_fkey
        FOREIGN KEY (report_id) REFERENCES public.report_metadata(id) ON DELETE CASCADE;
    END IF;
END;
$$;


COMMIT;
