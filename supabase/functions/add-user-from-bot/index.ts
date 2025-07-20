// было
//import { createClient, User } from '@supabase/supabase-js'

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, User } from 'jsr:@supabase/supabase-js@2'
//import { corsHeaders } from '../_shared/cors.ts'


/**
 * Edge-функция Supabase для добавления пользователя в организацию.
 *
 * Эта функция выполняет следующие шаги:
 * 1. Обрабатывает preflight-запросы CORS.
 * 2. Валидирует входные параметры из тела запроса (`organization_name`, `user_email`, `role`).
 * 3. Находит или создает организацию по ее имени.
 * 4. Приглашает пользователя по email. Если пользователь уже существует, получает его данные.
 * 5. Добавляет пользователя в список членов организации с указанной ролью.
 * 6. Идемпотентно обрабатывает случаи, когда пользователь уже является членом организации.
 *
 * @param {Request} req - Входящий объект запроса, содержащий в теле JSON с `organization_name`, `user_email` и `role`.
 * @returns {Response} Объект ответа с сообщением об успехе или ошибке.
 * - 200 OK: Пользователь успешно добавлен или уже является участником.
 * - 400 Bad Request: Отсутствуют или неверные параметры.
 * - 500 Internal Server Error: Произошла непредвиденная ошибка на сервере.
 */
Deno.serve(async (req) => {
  // Определяем заголовки CORS прямо в функции для устранения внешней зависимости
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Шаг 1: Обработка CORS preflight-запроса.
  // Браузеры отправляют OPTIONS-запрос перед фактическим запросом (например, POST),
  // чтобы проверить, разрешает ли сервер кросс-доменные запросы.
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

    // Шаг 2: Получение и валидация параметров из тела запроса.
    const { organization_name, user_email, role } = await req.json()
    if (!organization_name || !user_email || !role) {
      return new Response(JSON.stringify({ error: 'Необходимы параметры: organization_name, user_email, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Валидация значения роли.
    if (role !== 'admin' && role !== 'member') {
        return new Response(JSON.stringify({ error: 'Указана некорректная роль.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Шаг 3: Создание админского клиента Supabase.
    // Используется SERVICE_ROLE_KEY для выполнения операций с повышенными привилегиями,
    // таких как приглашение пользователей и запись в защищенные таблицы.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Шаг 4: Поиск или создание организации.
    // .upsert() атомарно вставляет новую запись или обновляет существующую, если возникает конфликт (по имени).
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .upsert({ name: organization_name }, { onConflict: 'name' })
      .select()
      .single()

//            .upsert({ name: organization_name }, { onConflict: 'name' })
//      .upsert({ name: organization_name })

    if (orgError) throw orgError

    // Шаг 5: Приглашение или поиск пользователя.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(user_email)
    let invitedUser: User | undefined = inviteData?.user

    if (inviteError && !invitedUser) {
      // Если inviteUserByEmail возвращает ошибку (например, "User already registered"),
      // это означает, что пользователь уже существует. В этом случае мы находим его по email.
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email: user_email })
      if (listError || users.length === 0) {
        // Если и найти не удалось, значит, произошла другая ошибка.
        throw new Error('Не удалось найти или пригласить пользователя.')
      }
      invitedUser = users[0]
    }

    if (!invitedUser) {
      // Финальная проверка, чтобы убедиться, что объект пользователя был получен.
      throw new Error('Не удалось получить данные пользователя после приглашения.')
    }

    // Шаг 6: Добавление пользователя в таблицу `organization_members`.
    // Эта операция связывает пользователя с организацией и назначает ему роль.
    const { error: insertError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: invitedUser.id,
        role: role,
      })

    if (insertError) {
      // Обработка случая, когда пользователь уже является членом организации.
      // Код '23505' в PostgreSQL означает нарушение ограничения уникальности (unique constraint violation).
      // Мы обрабатываем это как успешный, идемпотентный вызов.
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ message: `Пользователь ${user_email} уже является членом организации ${organization_name}.` }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Для всех других ошибок при вставке, пробрасываем их в catch-блок.
      throw insertError
    }

    // Возвращаем успешный ответ.
    return new Response(JSON.stringify({ message: `Пользователь ${user_email} успешно добавлен в организацию ${organization_name} с ролью ${role}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Глобальный обработчик ошибок. Логирует ошибку на сервере и возвращает клиенту ответ 500.
    console.error('Ошибка в функции add-user-from-bot:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})