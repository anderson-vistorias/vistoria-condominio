// ============================================================
//  VistoriaCondomínio — Supabase Client
//  Arquivo: supabase.js
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔴 SUBSTITUA COM SUAS CREDENCIAIS
const SUPABASE_URL  = 'https://vhagsqyuuqbltfrtnbtx.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_2-MKFNEV-csxLFQfTMuUag_7SNZncru';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
//  AUTH
// ============================================================
export const Auth = {

  async login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { ok: false, erro: traduzirErro(error.message) };

    const usuario = await DB.Usuarios.porAuthId(data.user.id);
    if (!usuario)  return { ok: false, erro: 'Usuário não encontrado no sistema.' };
    if (!usuario.ativo) return { ok: false, erro: 'Usuário inativo. Contate o administrador.' };

    return { ok: true, usuario };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async sessaoAtual() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChanged(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async criarUsuario(dados) {
  const FUNCTION_URL = 'https://vhagsqyuuqbltfrtnbtx.supabase.co/functions/v1/criar-usuario';

  // Pega o token da sessão atual do admin
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao?.session?.access_token || '';

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey':        'sb_publishable_yiUpm46k1Rf6DXgQhhM3-Q_CcGzPaOF',
    },
    body: JSON.stringify({
      email:     dados.email,
      senha:     dados.senha,
      nome:      dados.nome,
      role:      dados.role,
      cargo:     dados.cargo     || '',
      condoId:   dados.condoId   || null,
      condoNome: dados.condoNome || '',
      avatar:    dados.avatar    || '👤',
    }),
  });

  const json = await res.json();
  if (!json.ok) return { ok: false, erro: json.erro };
  return { ok: true, authId: json.authId };
},

  async trocarSenha(novaSenha) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw new Error(traduzirErro(error.message));
  },
};

// ============================================================
//  DB — BANCO DE DADOS
// ============================================================
export const DB = {

  // ----------------------------------------------------------
  //  CONDOMÍNIOS
  // ----------------------------------------------------------
  Condominios: {

    async listar() {
      const { data, error } = await supabase
        .from('condominios').select('*').order('nome');
      if (error) throw error;
      return data;
    },

    async listarAtivos() {
      const { data, error } = await supabase
        .from('condominios').select('*')
        .eq('status', 'Ativo').order('nome');
      if (error) throw error;
      return data;
    },

    async porId(id) {
      const { data, error } = await supabase
        .from('condominios').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },

    async porSlug(slug) {
      const { data, error } = await supabase
        .from('condominios').select('*').eq('slug', slug).single();
      if (error) return null;
      return data;
    },

    async criar(dados) {
      const { data, error } = await supabase
        .from('condominios').insert(dados).select().single();
      if (error) throw error;
      return data;
    },

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('condominios').update(dados).eq('id', id);
      if (error) throw error;
    },

    async deletar(id) {
      const { error } = await supabase
        .from('condominios').delete().eq('id', id);
      if (error) throw error;
    },

    // Tempo real
    observar(callback) {
      return supabase.channel('condominios')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'condominios' },
          () => this.listar().then(callback))
        .subscribe();
    },
  },

  // ----------------------------------------------------------
  //  USUÁRIOS
  // ----------------------------------------------------------
  Usuarios: {

    async listar() {
      const { data, error } = await supabase
        .from('usuarios').select('*').order('nome');
      if (error) throw error;
      return data;
    },

    async porId(id) {
      const { data, error } = await supabase
        .from('usuarios').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },

    async porAuthId(authId) {
      const { data, error } = await supabase
        .from('usuarios').select('*').eq('auth_id', authId).single();
      if (error) return null;
      return data;
    },

    async porEmail(email) {
      const { data, error } = await supabase
        .from('usuarios').select('*').eq('email', email).single();
      if (error) return null;
      return data;
    },

    async porCondo(condoId) {
      const { data, error } = await supabase
        .from('usuarios').select('*')
        .eq('condo_id', condoId).order('nome');
      if (error) throw error;
      return data;
    },

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('usuarios').update(dados).eq('id', id);
      if (error) throw error;
    },

    async deletar(id) {
      const { error } = await supabase
        .from('usuarios').delete().eq('id', id);
      if (error) throw error;
    },

    observar(callback) {
      return supabase.channel('usuarios')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'usuarios' },
          () => this.listar().then(callback))
        .subscribe();
    },
  },

  // ----------------------------------------------------------
  //  VISTORIAS
  // ----------------------------------------------------------
  Vistorias: {

    async listar(filtros = {}) {
      let q = supabase.from('vistorias').select('*');

      if (filtros.condoId) q = q.eq('condo_id',  filtros.condoId);
      if (filtros.userId)  q = q.eq('user_id',   filtros.userId);
      if (filtros.tipo)    q = q.eq('tipo',       filtros.tipo);
      if (filtros.status)  q = q.eq('status',     filtros.status);

      q = q.order('criado_em', { ascending: false });
      if (filtros.limite)  q = q.limit(filtros.limite);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async porId(id) {
      const { data, error } = await supabase
        .from('vistorias').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },

    async criar(dados) {
      const { data, error } = await supabase
        .from('vistorias').insert(dados).select().single();
      if (error) throw error;
      return data;
    },

    async atualizar(id, dados) {
      const { error } = await supabase
        .from('vistorias').update(dados).eq('id', id);
      if (error) throw error;
    },

    async resolver(id, observacao, userId) {
      const { error } = await supabase.from('vistorias').update({
        status:        'Resolvida',
        observacao,
        resolvido_por: userId,
        resolvido_em:  new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },

    async deletar(id) {
      const { error } = await supabase
        .from('vistorias').delete().eq('id', id);
      if (error) throw error;
    },

    async stats(condoId) {
      const todas    = await this.listar({ condoId });
      const abertas  = todas.filter(v => v.status === 'Aberta').length;
      const resolv   = todas.filter(v => v.status === 'Resolvida').length;
      const taxa     = todas.length > 0 ? Math.round((resolv / todas.length) * 100) : 0;
      const porTipo  = {};
      todas.forEach(v => { porTipo[v.tipo] = (porTipo[v.tipo] || 0) + 1; });
      return { total: todas.length, abertas, resolv, taxa, porTipo };
    },

    // Tempo real por condomínio
    observarPorCondo(condoId, callback) {
      return supabase.channel(`vistorias-${condoId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'vistorias',
            filter: `condo_id=eq.${condoId}` },
          () => this.listar({ condoId }).then(callback))
        .subscribe();
    },

    // Tempo real geral (admin)
    observar(callback) {
      return supabase.channel('vistorias-all')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'vistorias' },
          () => this.listar().then(callback))
        .subscribe();
    },
  },

  // ----------------------------------------------------------
  //  STORAGE — FOTOS
  // ----------------------------------------------------------
  Storage: {
    BUCKET: 'vistorias',

    async uploadFoto(file, condoId, vistoriaId) {
      const ext    = file.name.split('.').pop();
      const nome   = `${condoId}/${vistoriaId || 'temp'}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(this.BUCKET).upload(nome, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from(this.BUCKET).getPublicUrl(nome);
      return { url: data.publicUrl, caminho: nome };
    },

    async deletarFoto(caminho) {
      await supabase.storage.from(this.BUCKET).remove([caminho]);
    },
  },

  // ----------------------------------------------------------
  //  LOGS
  // ----------------------------------------------------------
  Logs: {
    async registrar(acao, dados, userId) {
      await supabase.from('logs').insert({ acao, dados, user_id: userId || null });
    },

    async listar(limite = 50) {
      const { data } = await supabase
        .from('logs').select('*')
        .order('criado_em', { ascending: false }).limit(limite);
      return data || [];
    },
  },
};

// ============================================================
//  UTILITÁRIOS
// ============================================================
function traduzirErro(msg) {
  const erros = {
    'Invalid login credentials':      'Email ou senha incorretos.',
    'Email not confirmed':            'Email não confirmado.',
    'User already registered':        'Email já cadastrado.',
    'Password should be at least 6':  'Senha deve ter ao menos 6 caracteres.',
    'Unable to validate email':       'Email inválido.',
    'Too many requests':              'Muitas tentativas. Aguarde alguns minutos.',
  };
  for (const [key, val] of Object.entries(erros)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}
