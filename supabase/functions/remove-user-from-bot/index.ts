// index.remove-user-from-bot.ts
// Edge-функция для удаления пользователя из организации по команде бота
// Вызывает SQL-RPC remove_user_from_organization(p_organization_id, p_user_email)
//
// Требуется переменные окружения:
//  - FUNCTION_API_KEY (для безопасности)
//  - SUPABASE_URL
//  - SUPABASE_SERVICE_ROLE_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

type Payload = {
  organization_name: string;
  user_email: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Метод не поддерживается" }, 405);
  }

  try {
    // 1) Проверка API-ключа (ОБЯЗАТЕЛЬНО для безопасности)
    const apiKeyHeader = req.headers.get("x-api-key");
    const functionKey = Deno.env.get("FUNCTION_API_KEY");
    if (!functionKey || apiKeyHeader !== functionKey) {
      return json({ error: "Доступ запрещён" }, 403);
    }

    // 2) Валидация входа
    const payload = (await req.json().catch(() => null)) as Payload | null;
    if (!payload) return json({ error: "Некорректный JSON" }, 400);

    const { organization_name, user_email } = payload;
    if (!organization_name || organization_name.trim().length < 2) {
      return json({ error: "organization_name обязателен и должен быть не короче 2 символов" }, 400);
    }
    if (!user_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
      return json({ error: "Укажите корректный user_email" }, 400);
    }

    // 3) Подключение Supabase с Service Role (бот — системный клиент)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Не заданы переменные окружения SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 4) Получаем ID организации
    const { data: orgData, error: orgErr } = await sb
      .from("organizations")
      .select("id")
      .eq("name", organization_name)
      .maybeSingle();
    if (orgErr) {
      console.error("Ошибка чтения organizations:", orgErr);
      return json({ error: "Ошибка поиска организации" }, 500);
    }
    if (!orgData?.id) {
      return json({ error: `Организация "${organization_name}" не найдена` }, 404);
    }
    const orgId = orgData.id;

    // 5) Вызываем RPC для удаления
    const { error: rpcErr } = await sb.rpc("remove_user_from_organization", {
      p_organization_id: orgId,
      p_user_email: user_email,
    });
    if (rpcErr) {
      console.error("RPC remove_user_from_organization error:", rpcErr);
      return json({ error: "Не удалось удалить пользователя из организации" }, 400);
    }

    // 6) Ответ
    return json({
      ok: true,
      organization_id: orgId,
      user_email,
      message: `Пользователь удалён из "${organization_name}"`,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});
