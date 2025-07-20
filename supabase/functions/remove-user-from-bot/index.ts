import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * @file Edge-функция Supabase для удаления пользователя из организации.
 *
 * Эта функция предназначена для вызова из автоматизированной системы (например, n8n)
 * для удаления пользователя из указанной организации. Функция защищена API-ключом,
 * передаваемым в параметрах URL. *
 * @requires_environment_variables
 * - `SUPABASE_URL`: URL вашего проекта Supabase.
 * - `SUPABASE_SERVICE_ROLE_KEY`: Ключ с ролью `service_role` для выполнения привилегированных операций.
 * - не исп `N8N_SECRET_TOKEN`: Секретный токен для авторизации запросов от n8n.
 * - `FUNCTION_API_KEY`: Секретный API-ключ для авторизации запросов.
 *
 * @request_url_params
 * @property {string} apiKey - API-ключ для авторизации.
 *
 * @request_body
 * @property {string} organization_name - Название организации, из которой удаляется пользователь.
 * @property {string} user_email_to_remove - Email пользователя, которого необходимо удалить.
 *
 * @returns {Response} JSON-ответ, указывающий на успех или неудачу операции.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Обработка CORS preflight-запроса
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



    // Шаг 2: Получение параметров из тела запроса
    const { organization_name, user_email_to_remove } = await req.json()
    if (!organization_name || !user_email_to_remove) {
      return new Response(JSON.stringify({ error: 'Parameters `organization_name` and `user_email_to_remove` are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Шаг 3: Создание админского клиента Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Шаг 4: Поиск ID организации по её названию
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', organization_name)
      .single()

    if (orgError || !orgData) {
      return new Response(JSON.stringify({ error: `Organization '${organization_name}' not found.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const organization_id = orgData.id

    // Шаг 5: Поиск ID пользователя по его email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ email: user_email_to_remove })
    if (userError || users.length === 0) {
      return new Response(JSON.stringify({ error: `User with email '${user_email_to_remove}' not found.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const user_id_to_remove = users[0].id

    // Шаг 6: Критическая проверка - является ли пользователь последним администратором в организации?
    const { data: isLastAdmin, error: rpcError } = await supabaseAdmin
      .rpc('is_last_admin_in_organization', {
        p_organization_id: organization_id,
        p_user_id: user_id_to_remove,
      })

    if (rpcError) throw new Error(`Error checking admin status: ${rpcError.message}`)

    if (isLastAdmin === true) {
      return new Response(JSON.stringify({ error: `Cannot remove user. ${user_email_to_remove} is the last administrator of the organization.` }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Шаг 7: Если все проверки пройдены, удаляем пользователя из организации
    const { error: deleteError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('organization_id', organization_id)
      .eq('user_id', user_id_to_remove)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: `User ${user_email_to_remove} has been successfully removed from organization ${organization_name}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Обработка непредвиденных ошибок (например, невалидный JSON в теле запроса)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})