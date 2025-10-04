-- Создание таблицы с полем created_at и updated_at
CREATE TABLE IF NOT EXISTS public.log_uploading_to_console (
  name_file text NOT NULL,
  file_md5 text PRIMARY KEY,
  status text NOT NULL,
  created_at timestamp default now() NOT NULL,
  updated_at timestamp default now() NOT NULL
);
