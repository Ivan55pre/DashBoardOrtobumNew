# Technical Context: DashBoardOrtobumNew

## Технологический стек

### Frontend
- **React 18** с функциональными компонентами и хуками
- **TypeScript** для строгой типизации
- **Tailwind CSS** для стилизации
- **Vite** как сборщик и dev-сервер
- **React Router** для навигации
- **Recharts** для визуализации данных

### Backend
- **Supabase** как BaaS (Backend as a Service)
  - PostgreSQL 15+ как основная БД
  - Edge Functions для серверной логики
  - Row Level Security (RLS) для безопасности
  - Real-time подписки

### Аутентификация и авторизация
- **Supabase Auth** с JWT токенами
- **Row Level Security** для ограничения доступа к данным
- **Organization-based permissions** для мультитенантности

### Интеграции
- **Telegram Bot API** для интеграции с Telegram
- **Supabase Storage** для хранения файлов
- **N8N** для автоматизации рабочих процессов

## Архитектура

### Структура проекта
```
src/
├── components/          # Переиспользуемые компоненты
├── contexts/           # React контексты
├── hooks/              # Кастомные хуки
├── pages/              # Страницы приложения
├── utils/              # Утилиты и хелперы
└── types.ts            # Типы TypeScript

supabase/
├── functions/          # Edge Functions
└── migrations/         # SQL миграции
```

### Паттерны проектирования
- **Container/Presentational pattern** для разделения логики и UI
- **Custom hooks** для бизнес-логики
- **Context API** для глобального состояния
- **Error boundaries** для обработки ошибок

## База данных

### Основные таблицы
- **users** - пользователи системы
- **organizations** - организации
- **organization_members** - связь пользователей с организациями
- **cash_bank_report_items** - данные по движению денежных средств
- **report_metadata** - метаданные отчетов
- **user_widget_settings** - настройки виджетов пользователей

### Безопасность
- RLS политики для всех таблиц
- Автоматическая фильтрация по организации
- Проверка прав доступа на уровне БД

## Развертывание

### Development
```bash
npm run dev     # Запуск dev-сервера
npm run build   # Сборка продакшн версии
```

### Production
- **Frontend**: Vercel/Netlify
- **Backend**: Supabase (managed)
- **CDN**: Для статических ресурсов

## Переменные окружения
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TELEGRAM_BOT_USERNAME=
```

## Зависимости

### Production dependencies
- @supabase/supabase-js
- react, react-dom
- react-router-dom
- recharts
- lucide-react

### Development dependencies
- TypeScript
- Vite
- Tailwind CSS
- ESLint
- PostCSS
