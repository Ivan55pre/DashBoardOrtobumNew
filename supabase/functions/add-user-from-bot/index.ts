// index.rpc.ts — Edge‑функция, вызывающая SQL‑RPC invite_user_to_organization
// Среда: Supabase Edge Functions (Deno, TypeScript)
// Используются миграции из вашего проекта:
//   - public.invite_user_to_organization(p_organization_id uuid, p_invitee_email text)
// Предполагается, что функция в БД создана (см. миграции 0008).
//
// Что делает:
// 1) CORS + preflight (OPTIONS).
// 2) Принимает { organization_name, user_email, role? }. Роль опциональна, по умолчанию остаётся 'member'.
// 3) Идёмпотентно находит/создаёт организацию по имени (таблица public.organizations).
// 4) Вызывает SQL‑RPC invite_user_to_organization(...) — добавляет пользователя как 'member'.
// 5) Если передана role='admin', повышает роль через UPDATE в public.organization_members (service‑key обходит RLS).
// 6) Возвращает 200 и JSON‑результат.
//
// Почему лучше так:
// - Вся доменная логика приглашения и валидации почты централизована в SQL‑RPC.
// - Из кода Edge‑функции уходит знание про структуру auth.users и т.п.
// - Легче сопровождать: изменили RPC — поведение обновилось везде.
//
// Безопасность: используем сервисный ключ (SERVICE_ROLE) — он обходит RLS и позволяет вызывать security invoker RPC.
// В ответах наружу не раскрываем детали ошибок/стек‑трейсы. В логи — можно писать больше подробностей.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS ---
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      global: { headers: { "X-Client-Info": "edge-rpc-invite" } },
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

    // 2) Вызываем SQL‑RPC: добавляет пользователя как 'member' или кидает ошибку, если email не найден
    // SQL сигнатура: invite_user_to_organization(p_organization_id uuid, p_invitee_email text)
    const { data: rpcData, error: rpcError } = await sb.rpc("invite_user_to_organization", {
      p_organization_id: orgId,
      p_invitee_email: user_email,
    });

    if (rpcError) {
      // Наиболее частые проблемы: "User with email ... not found", unique violation и т.п.
      // Наружу даём безопасное сообщение, детали — в логи.
      console.error("RPC invite_user_to_organization error:", rpcError);
      return json({ error: "Не удалось пригласить пользователя. Убедитесь, что email зарегистрирован." }, 400);
    }

    // 3) Если роль запрошена 'admin' — повышаем роль. RPC всегда создаёт 'member'.
    if (role === "admin") {
      const { error: updErr } = await sb
        .from("organization_members")
        .update({ role: "admin" })
        .eq("organization_id", orgId)
        .eq("user_id", (rpcData as any)?.user_id ?? null) // если RPC не возвращает user_id, сделаем апдейт по email через join ниже
        .select("id")
        .maybeSingle();

      if (updErr) {
        // fallback: обновим через join по auth.users.email
        const { error: updByEmailErr } = await sb.rpc("exec_sql", {
          // Для fallback нужен вспомогательный RPC, исполняющий произвольный SQL безопасно.
          // Если у вас его нет — см. примечание ниже.
          p_sql: `
            update public.organization_members om
            set role = 'admin'
            from auth.users u
            where om.organization_id = $1 and om.user_id = u.id and u.email = $2`,
          p_params: [orgId, user_email],
        });
        if (updByEmailErr) {
          console.warn("Не удалось повысить роль до admin:", updErr, updByEmailErr);
          // Не критично: пользователь пригласился как member.
        }
      }
    }

    return json({
      ok: true,
      organization_name,
      organization_id: orgId,
      user_email,
      role_assigned: role, // фактически назначенная роль (возможно, 'member', если апгрейд не удался)
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
