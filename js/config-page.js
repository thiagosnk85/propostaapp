const Config = {
  _company: null,

  async load() {
    const omieKeyEl = document.getElementById('cfg-appkey');
    const omieSecretEl = document.getElementById('cfg-appsecret');
    if (omieKeyEl) {
      omieKeyEl.value = '';
      omieKeyEl.placeholder = 'Configurado no Vercel Environment Variables';
      omieKeyEl.disabled = true;
    }
    if (omieSecretEl) {
      omieSecretEl.value = '';
      omieSecretEl.placeholder = 'Configurado no Vercel Environment Variables';
      omieSecretEl.disabled = true;
    }

    const cached = Cache.get('company');
    if (cached) {
      this._company = cached;
    } else {
      const { data } = await db.from('company_config').select('*').limit(1).single();
      this._company = data || {};
      if (data) Cache.set('company', data, 600000);
    }

    const co = this._company;
    document.getElementById('cfg-empresa').value = co.nome || '';
    document.getElementById('cfg-cnpj-empresa').value = co.cnpj || '';
    document.getElementById('cfg-endereco-empresa').value = co.endereco || '';
    document.getElementById('cfg-tel-empresa').value = co.telefone || '';
    document.getElementById('cfg-email-empresa').value = co.email || '';
  },

  async saveOmie() {
    UI.toast('As credenciais Omie agora devem ser configuradas no Vercel, nao no navegador.', 'info');
  },

  async testOmie() {
    const resEl = document.getElementById('cfg-test-result');
    resEl.textContent = 'Testando...';
    const ok = await Omie.test();
    resEl.innerHTML = ok
      ? '<span style="color:var(--success)">Conectado com sucesso.</span>'
      : '<span style="color:var(--danger)">Falha. Verifique as variaveis do Vercel e a sessao do usuario.</span>';
  },

  async saveCompany() {
    const profile = await currentProfile();
    if (profile?.role !== 'admin') {
      UI.toast('Apenas admins podem alterar dados da empresa.', 'error');
      return;
    }

    const payload = {
      nome: document.getElementById('cfg-empresa').value.trim(),
      cnpj: document.getElementById('cfg-cnpj-empresa').value.trim(),
      endereco: document.getElementById('cfg-endereco-empresa').value.trim(),
      telefone: document.getElementById('cfg-tel-empresa').value.trim(),
      email: document.getElementById('cfg-email-empresa').value.trim(),
    };

    const { error } = await db.from('company_config').update(payload).eq('id', this._company?.id);
    if (error) {
      UI.toast('Erro: ' + error.message, 'error');
      return;
    }

    this._company = { ...this._company, ...payload };
    Cache.set('company', this._company, 600000);
    UI.toast('Dados da empresa salvos.', 'success');
  },
};

const Team = {
  async load() {
    const profile = await currentProfile();
    if (profile?.role !== 'admin') {
      document.getElementById('team-list').innerHTML =
        '<div class="empty-state"><div class="empty-icon">!</div><div>Apenas admins podem gerenciar a equipe.</div></div>';
      return;
    }

    const { data } = await db.from('profiles').select('*').order('name');
    const el = document.getElementById('team-list');
    if (!el || !data) return;

    el.innerHTML = data.map(u => `
      <div class="team-card">
        <div class="team-avatar">${safeUrl(u.avatar_url) ? `<img src="${safeUrl(u.avatar_url)}" alt="${escHtml(u.name || 'Usuario')}" class="avatar-image">` : escHtml(u.name?.charAt(0)?.toUpperCase() || '?')}</div>
        <div style="flex:1">
          <div style="font-weight:600">${escHtml(u.name || '-')}</div>
          <div class="text-muted">${u.role === 'admin' ? 'Admin' : 'Usuario'}</div>
        </div>
        <div class="flex gap-2">
          ${u.id !== profile?.id ? `
            <button class="btn btn-outline btn-sm" onclick="Team.toggleRole('${u.id}','${u.role}')">
              ${u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
            </button>` : '<span class="text-muted" style="font-size:12px">Voce</span>'}
        </div>
      </div>`).join('');
  },

  async toggleRole(id, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    UI.openModal(
      'Alterar permissao',
      `<p>Deseja ${newRole === 'admin' ? 'tornar este usuario admin' : 'remover os privilegios de admin'}?</p>`,
      async () => {
        await db.from('profiles').update({ role: newRole }).eq('id', id);
        UI.closeModal();
        UI.toast('Permissao atualizada.', 'success');
        Team.load();
      }
    );
  },
};

const UserDirectory = {
  async load() {
    const { data, error } = await db.from('profiles').select('id,name,role,avatar_url,created_at').order('name');
    const el = document.getElementById('users-list');
    if (!el) return;
    if (error) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">!</div><div>Erro ao carregar usuarios.</div></div>';
      return;
    }
    if (!data?.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128101;</div><div>Nenhum usuario cadastrado.</div></div>';
      return;
    }

    el.innerHTML = data.map(u => `
      <div class="team-card">
        <div class="team-avatar">${safeUrl(u.avatar_url) ? `<img src="${safeUrl(u.avatar_url)}" alt="${escHtml(u.name || 'Usuario')}" class="avatar-image">` : escHtml(u.name?.charAt(0)?.toUpperCase() || '?')}</div>
        <div style="flex:1">
          <div style="font-weight:600">${escHtml(u.name || '-')}</div>
          <div class="text-muted">${u.role === 'admin' ? 'Admin' : 'Usuario'} | Cadastro em ${fmtDate(u.created_at)}</div>
        </div>
      </div>`).join('');
  },
};

const ProfilePage = {
  _avatarFile: null,

  _renderPreview(src, fallbackName) {
    const el = document.getElementById('profile-avatar-preview');
    if (!el) return;
    if (src) {
      const avatarUrl = safeUrl(src);
      if (avatarUrl) {
        el.innerHTML = `<img src="${avatarUrl}" alt="${escHtml(fallbackName || 'Usuario')}" class="avatar-image">`;
        return;
      }
    }
    el.textContent = (fallbackName || '?').charAt(0).toUpperCase();
  },

  onAvatarSelected(event) {
    const file = event.target.files?.[0] || null;
    this._avatarFile = file;
    if (!file) {
      this._renderPreview(document.getElementById('profile-avatar').value.trim(), document.getElementById('profile-name').value.trim());
      return;
    }

    if (!file.type.startsWith('image/')) {
      UI.toast('Selecione uma imagem valida.', 'error');
      event.target.value = '';
      this._avatarFile = null;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this._renderPreview(previewUrl, document.getElementById('profile-name').value.trim());
  },

  async load() {
    const user = await currentUser();
    const profile = await currentProfile();
    if (!user) return;

    this._avatarFile = null;
    document.getElementById('profile-name').value = profile?.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-avatar').value = profile?.avatar_url || '';
    document.getElementById('profile-avatar-file').value = '';
    document.getElementById('profile-pass').value = '';
    document.getElementById('profile-pass-confirm').value = '';
    this._renderPreview(profile?.avatar_url, profile?.name || user.email);
  },

  async _uploadAvatar(userId) {
    if (!this._avatarFile) {
      return document.getElementById('profile-avatar').value.trim() || null;
    }

    const ext = (this._avatarFile.name.split('.').pop() || 'png').toLowerCase();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await db.storage.from('avatars').upload(path, this._avatarFile, {
      upsert: true,
      contentType: this._avatarFile.type,
    });
    if (error) throw error;

    const { data } = db.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  },

  async save() {
    const user = await currentUser();
    if (!user) return;

    let avatarUrl = document.getElementById('profile-avatar').value.trim() || null;
    try {
      avatarUrl = await this._uploadAvatar(user.id);
    } catch (error) {
      const message = String(error?.message || error || '');
      if (message.toLowerCase().includes('bucket')) {
        UI.toast('Erro ao enviar foto: bucket "avatars" nao configurado. Execute o SQL supabase_avatar_storage.sql.', 'error');
      } else {
        UI.toast('Erro ao enviar foto: ' + message, 'error');
      }
      return;
    }

    const payload = {
      name: document.getElementById('profile-name').value.trim(),
      avatar_url: avatarUrl,
    };

    const { error } = await db.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      UI.toast('Erro ao salvar perfil: ' + error.message, 'error');
      return;
    }

    const merged = { ...(await currentProfile()), ...payload };
    Cache.set('profile_' + user.id, merged, 600000);
    document.getElementById('user-name').textContent = merged.name || user.email;
    document.getElementById('user-role').textContent = merged.role === 'admin' ? 'Admin' : 'Usuario';

    const avatarEl = document.getElementById('user-avatar');
    if (safeUrl(merged.avatar_url)) {
      avatarEl.innerHTML = `<img src="${safeUrl(merged.avatar_url)}" alt="${escHtml(merged.name || user.email)}" class="avatar-image">`;
    } else {
      avatarEl.textContent = (merged.name || user.email || '?').charAt(0).toUpperCase();
    }

    this._avatarFile = null;
    document.getElementById('profile-avatar').value = merged.avatar_url || '';
    document.getElementById('profile-avatar-file').value = '';
    this._renderPreview(merged.avatar_url, merged.name || user.email);
    UI.toast('Perfil atualizado com sucesso.', 'success');
    UserDirectory.load();
  },

  async changePassword() {
    const pass = document.getElementById('profile-pass').value;
    const confirm = document.getElementById('profile-pass-confirm').value;
    if (!pass || pass.length < 6) {
      UI.toast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (pass !== confirm) {
      UI.toast('As senhas nao coincidem.', 'error');
      return;
    }

    const { error } = await db.auth.updateUser({ password: pass });
    if (error) {
      UI.toast('Erro ao atualizar senha: ' + error.message, 'error');
      return;
    }

    document.getElementById('profile-pass').value = '';
    document.getElementById('profile-pass-confirm').value = '';
    UI.toast('Senha atualizada com sucesso.', 'success');
  },
};
