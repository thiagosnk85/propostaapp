// ============================================================
// js/supabase.js · Cliente Supabase
// ============================================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

const Cache = {
  _store: {},
  set(k, v, ttl = 60000) { this._store[k] = { v, exp: Date.now() + ttl }; },
  get(k) { const e = this._store[k]; return e && e.exp > Date.now() ? e.v : null; },
  del(k) { delete this._store[k]; },
};

async function currentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

function showDbError(context, error) {
  if (!error) return;
  const message = error.message || 'Falha desconhecida ao acessar o Supabase.';
  console.error(`[Supabase] ${context}:`, error);
  if (typeof UI?.toast === 'function') {
    UI.toast(`${context}: ${message}`, 'error');
  }
}

async function currentProfile() {
  const user = await currentUser();
  if (!user) return null;
  const cached = Cache.get('profile_' + user.id);
  if (cached) return cached;
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (data) Cache.set('profile_' + user.id, data);
  return data;
}

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:' || url.protocol === 'data:') {
      return url.href;
    }
  } catch (_) {
    return '';
  }
  return '';
}
