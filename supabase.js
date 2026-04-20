import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ✅ Substitua pelos seus dados reais do Supabase
const SUPABASE_URL  = 'https://vhagsqyuuqbltfrtnbtx.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWdzcXl1dXFibHRmcnRuYnR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNjEwNCwiZXhwIjoyMDkyMjAyMTA0fQ.1DvXNH-IQUnFEIL7cdYIn7eDJM-UpQdLlsWT6Wc8CI4' // anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ============================================================
   AUTH
   ============================================================ */
export const Auth = {
  async login(email, senha) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) return { ok: false, erro: error.message }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', data.user.id)
        .single()

      if (!perfil) return { ok: false, erro: 'Perfil não encontrado.' }
      return { ok: true, usuario: perfil }
    } catch (e) {
      return { ok: false, erro: e.message }
    }
  },

  async logout() {
    await supabase.auth.signOut()
  }
}

/* ============================================================
   DB — CONDOMÍNIOS
   ============================================================ */
export const DB = {
  Condominios: {
    async listar() {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome')
      if (error) throw error
      return data || []
    },

    async listarAtivos() {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .eq('status', 'Ativo')
        .order('nome')
      if (error) throw error
      return data || []
    },

    async porId(id) {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    async salvar(dados, id = null) {
      if (id) {
        const { error } = await supabase
          .from('condominios')
          .update(dados)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('condominios')
          .insert(dados)
        if (error) throw error
      }
    },

    async excluir(id) {
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  },

  /* ============================================================
     DB — USUÁRIOS
     ============================================================ */
  Usuarios: {
    async listar() {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome')
      if (error) throw error
      return data || []
    },

    async porId(id) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    // ✅ Criar usuário via Edge Function (cria no Auth + tabela usuarios)
    async criar({ nome, email, senha, role, cargo, condo_id, ativo, telefone }) {
      const { data, error } = await supabase.functions.invoke('criar-usuario', {
        body: { nome, email, senha, role, cargo, condo_id, ativo, telefone }
      })
      if (error) throw new Error(error.message || 'Erro ao invocar função')
      if (data?.erro) throw new Error(data.erro)
      return data
    },

    // ✅ Atualizar dados (sem mexer no Auth)
    async atualizar(id, dados) {
      const { error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('id', id)
      if (error) throw error
    },

    async excluir(id) {
      // Busca o auth_id antes de excluir
      const { data: u } = await supabase
        .from('usuarios')
        .select('auth_id')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)
      if (error) throw error

      // Tenta excluir do Auth também via Edge Function
      if (u?.auth_id) {
        await supabase.functions.invoke('excluir-usuario', {
          body: { auth_id: u.auth_id }
        }).catch(() => {}) // silencia se não existir
      }
    }
  },

  /* ============================================================
     DB — VISTORIAS
     ============================================================ */
  Vistorias: {
    async listar() {
      const { data, error } = await supabase
        .from('vistorias')
        .select(`
          *,
          condominios ( nome ),
          usuarios    ( nome )
        `)
        .order('criado_em', { ascending: false })
      if (error) throw error

      return (data || []).map(v => ({
        ...v,
        condo_nome: v.condominios?.nome || '—',
        user_nome:  v.usuarios?.nome    || '—',
      }))
    },

    async salvar(dados) {
      const { error } = await supabase.from('vistorias').insert(dados)
      if (error) throw error
    },

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('vistorias')
        .update(dados)
        .eq('id', id)
      if (error) throw error
    },

    async excluir(id) {
      const { error } = await supabase
        .from('vistorias')
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  }
}
