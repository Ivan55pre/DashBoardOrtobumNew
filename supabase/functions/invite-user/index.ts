// index.invite-user.reviewed.ts
// Edge-функция для приглашения пользователя в организацию через Supabase
// и уже готовую SQL-функцию invite_user_to_organization(p_organization_id, p_invitee_email)
//
// Использование:
//   POST /invite-user
//   Headers: x-api-key: <FUNCTION_API_KEY>
//   Body: { "organization_name": "...", "user_email": "...", "role": "admin" | "member" }
//
// Требуется в переменных окружения:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - FUNCTION_API_KEY
//
// Логика:
// 1) Проверка API-ключа (x-api-key).
// 2) CORS + preflight.
// 3) Валидация входных данных.
// 4) Идемпотентно находим или создаём организацию.
// 5) Через Admin API проверяем, есть ли пользователь по email; если нет — шлём invite.
// 6) Вызываем SQL-RPC invite_user_to_organization(...).
// 7) При role="admin" повышаем роль в organization_members.
// 8) Возвращаем JSON-ответ.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS ---
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// --- Тип входных данных ---
type Payload = {
  organization_name: string;
  user_email: string;
  role?: "admin" | "member";
};

// --- Утилита ответа ---
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Метод не поддерживается" }, 405);
  }

  try {
    // 1) Проверка API-ключа
    const apiKeyHeader = req.headers.get("x-api-key");
    const functionKey = Deno.env.get("FUNCTION_API_KEY");
    if (!functionKey || apiKeyHeader !== functionKey) {
      return json({ error: "Доступ запрещён" }, 403);
    }

    // 2) Валидация входа
    const payload = (await req.json().catch(() => null)) as Payload | null;
    if (!payload) return json({ error: "Некорректный JSON" }, 400);

    const { organization_name, user_email } = payload;
    let role: "admin" | "member" = (payload.role ?? "member").toLowerCase() as any;
    if (!["admin", "member"].includes(role)) role = "member";

    if (!organization_name || organization_name.trim().length < 2) {
      return json({ error: "organization_name обязателен и должен быть не короче 2 символов" }, 400);
    }
    if (!user_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
      return json({ error: "Укажите корректный user_email" }, 400);
    }

    // 3) Подключение Supabase с сервисным ключом
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Не заданы переменные окружения SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 4) Идемпотентно получаем или создаём организацию
    let orgId: string | null = null;
    {
      const { data, error } = await sb.from("organizations").select("id").eq("name", organization_name).maybeSingle();
      if (error) {
        console.error("SELECT organizations error:", error);
        return json({ error: "Ошибка чтения organizations" }, 500);
      }
      if (data?.id) {
        orgId = data.id;
      } else {
        const { data: inserted, error: insErr } = await sb
          .from("organizations")
          .insert({ name: organization_name })
          .select("id")
          .single();
        if (insErr) {
          // Конфликт уникальности — перечитаем
          if ((insErr as any).code === "23505") {
            const { data: again } = await sb
              .from("organizations")
              .select("id")
              .eq("name", organization_name)
              .maybeSingle();
            orgId = again?.id ?? null;
          } else {
            console.error("INSERT organizations error:", insErr);
            return json({ error: "Не удалось создать организацию" }, 500);
          }
        } else {
          orgId = inserted.id;
        }
      }
    }
    if (!orgId) return json({ error: "Не удалось определить организацию" }, 500);

    // 5) Проверяем пользователя по email
    let userId: string | null = null;
    const { data: userByEmail } = await sb.auth.admin.getUserByEmail(user_email);
    if (userByEmail?.user) {
      userId = userByEmail.user.id;
    } else {
      // Шлём приглашение (пользователь ещё не зарегистрирован)
      const { data: invited, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(user_email);
      if (inviteErr) {
        console.error("Ошибка приглашения:", inviteErr);
        return json({ error: "Не удалось отправить приглашение" }, 400);
      }
      userId = invited?.user?.id ?? null;
    }
    if (!userId) return json({ error: "Не удалось определить пользователя" }, 500);

    // 6) Вызываем SQL-RPC invite_user_to_organization
    const { error: rpcError } = await sb.rpc("invite_user_to_organization", {
      p_organization_id: orgId,
      p_invitee_email: user_email,
    });
    if (rpcError) {
      console.error("RPC invite_user_to_organization error:", rpcError);
      return json({ error: "Не удалось пригласить пользователя" }, 400);
    }

    // 7) Если роль = admin — повышаем
    if (role === "admin") {
      const { error: updErr } = await sb
        .from("organization_members")
        .update({ role: "admin" })
        .eq("organization_id", orgId)
        .eq("user_id", userId);
      if (updErr) {
        console.warn("Не удалось повысить роль:", updErr);
      }
    }

    // 8) Ответ
    return json({
      ok: true,
      organization_id: orgId,
      user_id: userId,
      role,
      message:
        role === "admin"
          ? `Пользователь приглашён в "${organization_name}" и назначен администратором`
          : `Пользователь приглашён в "${organization_name}" как участник`,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
