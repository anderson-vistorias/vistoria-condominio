import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {

  // ✅ Preflight CORS — OBRIGATÓRIO
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('📥 Body:', JSON.stringify(body))

    const { nome, email, senha, role, cargo, condo_id, condo_nome, ativo, telefone } = body

    // Validações básicas
    if (!nome || !email || !senha || !role) {
      return new Response(
        JSON.stringify({ erro: 'Campos obrigatórios: nome, email, senha, role' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Criar no Supabase Auth
    console.log('🔐 Criando usuário no Auth...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return new Response(
        JSON.stringify({ erro: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('✅ Auth criado:', authData.user.id)

    // 2️⃣ Inserir na tabela usuarios
    console.log('💾 Inserindo na tabela usuarios...')
    const { error: dbError } = await supabase.from('usuarios').insert({
      auth_id:    authData.user.id,
      nome,
      email,
      role,
      cargo:      cargo      || null,
      condo_id:   condo_id   || null,
      condo_nome: condo_nome || null,
      ativo:      ativo      ?? true,
      telefone:   telefone   || null,
    })

    if (dbError) {
      console.error('❌ DB error:', dbError.message)

      // Rollback: remove o usuário do Auth se falhou no DB
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.log('🔄 Rollback: usuário removido do Auth')

      return new Response(
        JSON.stringify({ erro: dbError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('✅ Usuário criado com sucesso!')

    return new Response(
      JSON.stringify({ ok: true, auth_id: authData.user.id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (e) {
    console.error('💥 Exception:', e.message)
    return new Response(
      JSON.stringify({ erro: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
