// ════════════════════════════════════════════
// js/auth.js  ·  Autenticação
// ════════════════════════════════════════════

const Auth = {
  async init() {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) {
      this._setError('Falha ao iniciar sessão: ' + error.message);
      return;
    }
    if (session) {
      await this._onLogin(session.user);
    } else {
      this._showAuth();
    }
    db.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this._onLogin(session.user);
      } else if (event === 'SIGNED_OUT') {
        this._showAuth();
      }
    });
  },

  async _onLogin(user) {
    let profile = null;
    try {
      profile = await currentProfile();
    } catch (error) {
      showDbError('Erro ao carregar perfil', error);
    }
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    // Sidebar user info
    const name = profile?.name || user.email;
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role').textContent = profile?.role === 'admin' ? 'Admin' : 'Usuario';
    const avatarEl = document.getElementById('user-avatar');
    const avatarUrl = safeUrl(profile?.avatar_url);
    if (avatarUrl) avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${escHtml(name)}" class="avatar-image">`;
    else avatarEl.textContent = name.charAt(0).toUpperCase();
    // Admin features
    if (profile?.role === 'admin') {
      document.getElementById('nav-equipe').style.display = 'flex';
    }
    // Init app
    await App.init();
  },

  _showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  },

  showLogin()    { this._toggle('auth-login'); },
  showRegister() { this._toggle('auth-register'); },
  showForgot()   { this._toggle('auth-forgot'); },

  _toggle(show) {
    ['auth-login','auth-register','auth-forgot'].forEach(id => {
      document.getElementById(id).style.display = id === show ? 'block' : 'none';
    });
    this._clearError();
  },

  _setError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg; el.style.display = 'block';
  },
  _clearError() {
    document.getElementById('auth-error').style.display = 'none';
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    if (!email || !pass) return this._setError('Preencha e-mail e senha.');
    const { error } = await db.auth.signInWithPassword({ email, password: pass });
    if (error) this._setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  },

  async register() {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-pass').value;
    if (!name || !email || !pass) return this._setError('Preencha todos os campos.');
    if (pass.length < 6) return this._setError('Senha deve ter no mínimo 6 caracteres.');
    const { error } = await db.auth.signUp({
      email, password: pass,
      options: { data: { name } }
    });
    if (error) this._setError(error.message);
    else {
      document.getElementById('reg-name').value = '';
      document.getElementById('reg-email').value = '';
      document.getElementById('reg-pass').value = '';
      this.showLogin();
      UI.toast('Conta criada! Agora faca login.', 'success');
    }
  },

  async forgot() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return this._setError('Informe seu e-mail.');
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: APP_URL + '/reset-password.html'
    });
    if (error) this._setError(error.message);
    else { UI.toast('Link enviado para ' + email, 'success'); this.showLogin(); }
  },

  async logout() {
    await db.auth.signOut();
    Cache._store = {};
  },
};
