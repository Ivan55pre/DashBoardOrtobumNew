import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * @file Edge-функция Supabase для административного удаления пользователя.
 *
 * Эта функция позволяет безопасно удалить пользователя из системы, используя
 * привилегированный ключ. Она предназначена для вызова из доверенной среды,
 * например, из другой серверной службы или панели администратора.
 *
 * @requires_environment_variables
 * - `SUPABASE_URL`: URL вашего проекта Supabase.
 * - `SUPABASE_SERVICE_ROLE_KEY`: Ключ с ролью `service_role` для выполнения привилегированных операций.
 *
 * @request_body
 * @property {string} user_id - UUID пользователя, которого необходимо удалить.
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


    // Шаг 1: Получение ID пользователя из тела запроса
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Параметр 'user_id' обязателен." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Шаг 2: Создание админского клиента Supabase для выполнения привилегированных операций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Шаг 3: Вызов административного метода для удаления пользователя
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (error) {
      // Если Supabase вернул ошибку (например, пользователь не найден).
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Шаг 4: В случае успеха возвращаем подтверждение
    return new Response(JSON.stringify({ message: `Пользователь ${user_id} успешно удален.` }), {
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