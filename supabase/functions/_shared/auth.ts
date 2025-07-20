import { createClient } from '@supabase/supabase-js'

/**
 * Checks for the n8n secret token in the Authorization header.
 * Throws an error if the token is invalid or missing.
 */
export function assertN8nSecret(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const n8nSecret = Deno.env.get('N8N_SECRET_TOKEN')
  if (!n8nSecret || authHeader !== `Bearer ${n8nSecret}`) {
    throw new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing secret token.' }), { status: 401 })
  }
}