Сделала пару файлов для сценария admin‑delete‑user — и Edge‑функцию, и SQL‑RPC.

Edge‑функция: index.admin-delete-user.ts

Миграция RPC: 0014_remove_user_from_organization.sql

Что делает
По organization_name находит организацию.

По user_email находит пользователя.

Вызывает SQL‑RPC remove_user_from_organization(p_organization_id uuid, p_user_email text), которая:

проверяет, что это не последний админ в организации,

удаляет запись из organization_members.

Если передать delete_from_auth: true, дополнительно удаляет пользователя из Auth (глобально, аккуратнее с этим флагом).

Пример запроса из n8n / бота
json
Копировать
Редактировать
POST /admin-delete-user
Headers: x-api-key: <FUNCTION_API_KEY>
Body: {
  "organization_name": "FRESHCAFE",
  "user_email": "user@example.com",
  "delete_from_auth": false
}
Заметки по безопасности и логике
Функция требует FUNCTION_API_KEY в заголовке x-api-key.

Работает с Service Role — RLS не мешает, а запрет «удалить последнего админа» реализован в самой SQL‑RPC.

Если хотите убрать прямой UPDATE из других функций — можно по аналогии сделать RPC set_member_role(...) и звать её из Edge.

