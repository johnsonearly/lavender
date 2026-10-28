// Supabase Edge Function (Deno): deletes the caller's photos, data and auth user.
// Requires the service-role key, which Supabase provides to functions automatically
// (never expose it to the browser). Table rows cascade from auth.users.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Not signed in' }, 401)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return json({ error: 'Not signed in' }, 401)
  const userId = data.user.id

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Remove every photo in the user's private folder (paged).
  for (;;) {
    const { data: files, error: listError } = await admin.storage.from('wardrobe-images').list(userId, { limit: 1000 })
    if (listError) return json({ error: listError.message }, 500)
    if (!files?.length) break
    const { error: removeError } = await admin.storage.from('wardrobe-images').remove(files.map((f) => `${userId}/${f.name}`))
    if (removeError) return json({ error: removeError.message }, 500)
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) return json({ error: deleteError.message }, 500)
  return json({ deleted: true })
})
