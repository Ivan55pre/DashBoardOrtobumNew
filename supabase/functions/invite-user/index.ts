import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, User } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
       // 1. ПРОВЕРКА БЕЗОПАСНОСТИ
    //const authHeader = req.headers.get('Authorization')
    //const n8nSecret = Deno.env.get('N8N_SECRET_TOKEN')

    //console.log('n8nSecret:', n8nSecret);    
    //if (!n8nSecret) {
    //  console.error('N8N_SECRET_TOKEN environment variable not set.')
    //  return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
    //    status: 500,
    //    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //  })
    //}

    //if (authHeader !== `Bearer ${n8nSecret}`) {
    //  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //    status: 401,
    //    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //  })
    //}
       // Шаг : Проверка безопасности с помощью API-ключа в параметрах URL.
    const url = new URL(req.url)
    const apiKey = url.searchParams.get('apiKey')
    const serverApiKey = Deno.env.get('FUNCTION_API_KEY') // Рекомендуется использовать отдельную переменную окружения

    if (!serverApiKey) {
      console.error('FUNCTION_API_KEY environment variable not set.')
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (apiKey !== serverApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing API Key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Шаг 1: Получение параметров из тела запроса
    const { organization_name, email_to_invite, role } = await req.json()
    if (!organization_name || !email_to_invite || !role) {
      return new Response(JSON.stringify({ error: 'Parameters `organization_name`, `email_to_invite`, and `role` are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    if (role !== 'admin' && role !== 'member') {
        return new Response(JSON.stringify({ error: 'Invalid role specified.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    // Создание админского клиента Supabase для выполнения привилегированных операций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // === Новый шаг: Получаем organization_id по имени ===
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', organization_name)
      .single()

    if (orgError || !orgData?.id) {
      return new Response(JSON.stringify({ error: `Organization "${organization_name}" not found or inactive.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    const organization_id = orgData.id

    // Приглашение пользователя по email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email_to_invite);
    let invitedUser: User | undefined = inviteData?.user;

    if (inviteError && !invitedUser) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email: email_to_invite });
        if (listError || users.length === 0) {
            return new Response(JSON.stringify({ error: 'Failed to find or invite user.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        invitedUser = users[0];
    }

    if (!invitedUser) {
      return new Response(JSON.stringify({ error: 'Failed to get user data after invitation.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Добавление или обновление пользователя в organization_members (Upsert).
    // Этот подход атомарно добавляет пользователя, если его нет, или обновляет его роль, если он уже существует.
    const { error: upsertError } = await supabaseAdmin
      .from('organization_members')
      .upsert({
        organization_id: organization_id,
        user_id: invitedUser.id,
        role: role,
      }, {
        onConflict: 'organization_id, user_id', // Указываем колонки для проверки конфликта
      })

    if (upsertError) {
      return new Response(JSON.stringify({ error: `Database error: ${upsertError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ message: `User ${email_to_invite} has been successfully added or updated in the organization.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
