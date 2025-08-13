// add-user-from-bot/index.ts — Edge-функция для добавления СУЩЕСТВУЮЩЕГО пользователя в организацию.
// Среда: Supabase Edge Functions (Deno, TypeScript)
//
// Что делает:
// 1) CORS + preflight (OPTIONS).
// 2) Проверяет API-ключ (x-api-key).
// 3) Принимает { organization_name, user_email, role? }.
// 4) Идемпотентно находит/создаёт организацию по имени.
// 5) Находит ID пользователя по email. Если не найден — ошибка.
// 6) Вызывает SQL-RPC invite_user_to_organization(...) для добавления пользователя.
// 7) Если передана role='admin', повышает роль через UPDATE.
// 8) Возвращает JSON-результат.
//
// Отличие от `invite-user`: эта функция НЕ отправляет приглашений новым пользователям.
// Она работает только с теми, кто уже зарегистрирован.
//

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS ---
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

type Payload = {
  organization_name: string;
  user_email: string;
  role?: "admin" | "member"; // необязательно; invite RPC всегда добавляет 'member'
};

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
    return json({ error: "Используйте метод POST" }, 405);
  }

  try {
    // Проверка API-ключа
    const apiKeyHeader = req.headers.get("x-api-key");
    const functionKey = Deno.env.get("FUNCTION_API_KEY");
    if (!functionKey || apiKeyHeader !== functionKey) {
      return json({ error: "Доступ запрещён" }, 403);
    }

    // Parse/validate
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

    // Supabase client (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Не заданы переменные окружения SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { "X-Client-Info": "edge-add-user-from-bot" } },
    });

    // 1) Идемпотентно получаем id организации по имени (создаём если нет)
    let orgId: string | null = null;

    // сначала пробуем найти
    {
      const { data, error } = await sb.from("organizations").select("id").eq("name", organization_name).maybeSingle();
      if (error) {
        console.error("SELECT organizations error:", error);
        return json({ error: "Ошибка чтения organizations" }, 500);
      }
      if (data?.id) {
        orgId = data.id;
      } else {
        // создаём
        const { data: inserted, error: insErr } = await sb
          .from("organizations")
          .insert({ name: organization_name })
          .select("id")
          .single();
        if (insErr) {
          // возможна гонка -> перечитаем
          if ((insErr as any).code === "23505") {
            const { data: again, error: againErr } = await sb
              .from("organizations")
              .select("id")
              .eq("name", organization_name)
              .maybeSingle();
            if (againErr || !again?.id) {
              console.error("CONFLICT org re-read error:", againErr);
              return json({ error: "Организация существует, но не найдена" }, 500);
            }
            orgId = again.id;
          } else {
            console.error("INSERT organizations error:", insErr);
            return json({ error: "Не удалось создать организацию" }, 500);
          }
        } else {
          orgId = inserted.id;
        }
      }
    }

    // 2) Находим ID пользователя по email. В отличие от `invite-user`, мы не приглашаем новых.
    const { data: userData, error: userError } = await sb.from("users").select("id").eq("email", user_email).maybeSingle();
    if (userError || !userData?.id) {
      console.error("User lookup error:", userError);
      return json({ error: "Пользователь с таким email не найден в системе." }, 404);
    }
    const userId = userData.id;

    // 3) Вызываем SQL-RPC для добавления пользователя в организацию
    const { error: rpcError } = await sb.rpc("invite_user_to_organization", {
      p_organization_id: orgId,
      p_invitee_email: user_email,
    });

    if (rpcError) {
      // Возможная ошибка: пользователь уже состоит в организации (unique violation).
      console.error("RPC invite_user_to_organization error:", rpcError);
      return json({ error: "Не удалось добавить пользователя в организацию. Возможно, он уже является участником." }, 400);
    }

    // 4) Если роль запрошена 'admin' — повышаем роль.
    if (role === "admin") {
      const { error: updErr } = await sb
        .from("organization_members")
        .update({ role: "admin" })
        .eq("organization_id", orgId)
        .eq("user_id", userId);

      if (updErr) {
        console.warn("Не удалось повысить роль до admin:", updErr);
        // Не критично: пользователь был добавлен как 'member'.
      }
    }

    return json({
      ok: true,
      organization_name,
      organization_id: orgId,
      user_email,
      role_assigned: role,
      message:
        role === "admin"
          ? `Пользователь приглашён в "${organization_name}" и назначен администратором.`
          : `Пользователь приглашён в "${organization_name}" как участник.`,
    });
  } catch (e) {
    console.error("Unhandled error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
