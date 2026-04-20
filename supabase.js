import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://vhagsqyuuqbltfrtnbtx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWdzcXl1dXFibHRmcnRuYnR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNjEwNCwiZXhwIjoyMDkyMjAyMTA0fQ.1DvXNH-IQUnFEIL7cdYIn7eDJM-UpQdLlsWT6Wc8CI4'

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

  // ✅ CORRIGIDO — era chamado como Auth.criarUsuario() no index.html
  async criarUsuario({ nome, email, senha, role, cargo, condoId, condoNome }) {
    try {
      const { data, error } = await supabase.functions.invoke('criar-usuario', {
        body: { nome, email, senha, role, cargo, condo_id: condoId, condo_nome: condoNome }
      })
      if (error) throw new Error(error.message || 'Erro ao invocar função')
      if (data?.erro) return { ok: false, erro: data.erro }
      return { ok: true, usuario: data }
    } catch (e) {
      return { ok: false, erro: e.message }
    }
  },

  async logout() {
    await supabase.auth.signOut()
  }
}

/* ============================================================
   DB
   ============================================================ */
export const DB = {

  /* ----------------------------------------------------------
     CONDOMÍNIOS
     ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     USUÁRIOS
     ---------------------------------------------------------- */
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

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('id', id)
      if (error) throw error
    },

    async excluir(id) {
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

      if (u?.auth_id) {
        await supabase.functions.invoke('excluir-usuario', {
          body: { auth_id: u.auth_id }
        }).catch(() => {})
      }
    }
  },

  /* ----------------------------------------------------------
     VISTORIAS
     ---------------------------------------------------------- */
  Vistorias: {
    // ✅ CORRIGIDO — agora aceita filtros (userId, condoId, tipo, status)
    async listar(filtros = {}) {
      let query = supabase
        .from('vistorias')
        .select('*')
        .order('criado_em', { ascending: false })

      if (filtros.userId)  query = query.eq('user_id', filtros.userId)
      if (filtros.condoId) query = query.eq('condo_id', filtros.condoId)
      if (filtros.tipo)    query = query.eq('tipo', filtros.tipo)
      if (filtros.status)  query = query.eq('status', filtros.status)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    // ✅ ADICIONADO — era chamado como DB.Vistorias.porId() no index.html
    async porId(id) {
      const { data, error } = await supabase
        .from('vistorias')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    // ✅ CORRIGIDO — era chamado como DB.Vistorias.criar() no index.html
    async criar(dados) {
      const { data, error } = await supabase
        .from('vistorias')
        .insert(dados)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('vistorias')
        .update(dados)
        .eq('id', id)
      if (error) throw error
    },

    // ✅ CORRIGIDO — era chamado como DB.Vistorias.deletar() no index.html
    async deletar(id) {
      const { error } = await supabase
        .from('vistorias')
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  },

  /* ----------------------------------------------------------
     STORAGE — FOTOS
     ---------------------------------------------------------- */
  // ✅ ADICIONADO — era chamado no index.html mas não existia
  Storage: {
    async uploadFoto(file, condoId, vistoriaId) {
      const ext      = file.name.split('.').pop()
      const filename = `${condoId}/${vistoriaId}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('fotos-vistorias')
        .upload(filename, file, { upsert: true })

      if (error) throw error

      const { data } = supabase.storage
        .from('fotos-vistorias')
        .getPublicUrl(filename)

      return { url: data.publicUrl }
    }
  },

  /* ----------------------------------------------------------
     LOGS
     ---------------------------------------------------------- */
  // ✅ ADICIONADO — era chamado no index.html mas não existia
  Logs: {
    async registrar(acao, detalhes = {}, userId = null) {
      try {
        await supabase.from('logs').insert({
          acao,
          detalhes,
          user_id:    userId,
          criado_em:  new Date().toISOString()
        })
      } catch (e) {
        // Silencia erro de log para não travar a aplicação
        console.warn('Erro ao registrar log:', e.message)
      }
    }
  }
}
