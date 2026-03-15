// ============================================================
// js/templates.js · Templates de condições
// ============================================================

const TIPO_LABELS = {
  prazo: 'Prazo',
  pagamento: 'Pagamento',
  impostos: 'Impostos',
  local: 'Local',
  validade: 'Validade',
  cond_gerais: 'Cond. Gerais',
};

const Templates = {
  _list: [],

  async load() {
    const { data, error } = await db
      .from('condition_templates')
      .select('*')
      .order('tipo')
      .order('titulo');

    if (error) {
      UI.toast('Erro ao carregar templates: ' + error.message, 'error');
      return;
    }

    this._list = data || [];
    this._render();
  },

  _render() {
    const el = document.getElementById('templates-list');
    if (!el) return;

    if (!this._list.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><div>Nenhum template cadastrado.</div></div>';
      return;
    }

    el.innerHTML = this._list.map(t => `
      <div class="template-card">
        <span class="tpl-tipo">${TIPO_LABELS[t.tipo] || t.tipo}</span>
        <div style="flex:1">
          <div class="tpl-titulo">${escHtml(t.titulo)}${t.is_default ? ' <span style="font-size:10px;color:var(--accent)">★ padrão</span>' : ''}</div>
          <div class="tpl-conteudo">${escHtml(t.conteudo)}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="Templates.edit('${t.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="Templates.delete('${t.id}')">✕</button>
        </div>
      </div>`).join('');
  },

  async loadChips() {
    const { data, error } = await db
      .from('condition_templates')
      .select('*')
      .order('tipo')
      .order('titulo');

    if (error || !data) return;

    const tipos = ['prazo', 'pagamento', 'impostos', 'local', 'validade', 'cond_gerais'];
    tipos.forEach(tipo => {
      const el = document.getElementById('tpl-' + tipo);
      if (!el) return;

      const items = data.filter(t => t.tipo === tipo);
      el.innerHTML = items.map(t => `
        <span class="tpl-chip" onclick="Templates.applyChip('${tipo}', '${encodeURIComponent(t.conteudo)}')">
          ${escHtml(t.titulo)}
        </span>`).join('');
    });
  },

  applyChip(tipo, conteudo) {
    const fieldMap = {
      prazo: 'f-prazo',
      pagamento: 'f-pagamento',
      impostos: 'f-impostos',
      local: 'f-local',
      validade: 'f-validade',
      cond_gerais: 'f-cond-gerais',
    };

    const el = document.getElementById(fieldMap[tipo]);
    if (el) {
      el.value = decodeURIComponent(conteudo);
      UI.toast('Template aplicado', 'success');
    }
  },

  openModal(id = null) {
    const t = id ? this._list.find(x => x.id === id) : null;

    UI.openModal(
      t ? 'Editar Template' : 'Novo Template',
      `<div class="form-group" style="margin-bottom:12px">
        <label>Tipo</label>
        <select id="tpl-new-tipo">
          ${Object.entries(TIPO_LABELS).map(([value, label]) => `<option value="${value}" ${t?.tipo === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label>Título</label>
        <input type="text" id="tpl-new-titulo" value="${escHtml(t?.titulo || '')}" placeholder="Nome do template">
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label>Conteúdo</label>
        <textarea id="tpl-new-conteudo" rows="4">${escHtml(t?.conteudo || '')}</textarea>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="tpl-new-default" ${t?.is_default ? 'checked' : ''}> Marcar como padrão
      </label>`,
      () => this.save(id)
    );
  },

  edit(id) {
    this.openModal(id);
  },

  async save(id = null) {
    const confirmBtn = document.getElementById('modal-confirm');
    const tipo = document.getElementById('tpl-new-tipo')?.value;
    const titulo = document.getElementById('tpl-new-titulo')?.value?.trim();
    const conteudo = document.getElementById('tpl-new-conteudo')?.value?.trim();
    const isDef = document.getElementById('tpl-new-default')?.checked;

    if (!titulo || !conteudo) {
      UI.toast('Preencha título e conteúdo.', 'error');
      return;
    }

    UI.setLoading(confirmBtn, true);

    try {
      const payload = { tipo, titulo, conteudo, is_default: isDef };
      const result = id
        ? await db.from('condition_templates').update(payload).eq('id', id)
        : await db.from('condition_templates').insert(payload);

      if (result.error) {
        UI.toast('Erro ao salvar template: ' + result.error.message, 'error');
        return;
      }

      UI.closeModal();
      UI.toast('Template salvo!', 'success');
      await this.load();
      await this.loadChips();
    } finally {
      UI.setLoading(confirmBtn, false);
    }
  },

  async delete(id) {
    UI.openModal('Remover Template', '<p>Tem certeza que deseja remover este template?</p>', async () => {
      const confirmBtn = document.getElementById('modal-confirm');
      UI.setLoading(confirmBtn, true);

      try {
        const { error } = await db.from('condition_templates').delete().eq('id', id);
        if (error) {
          UI.toast('Erro ao remover template: ' + error.message, 'error');
          return;
        }

        UI.closeModal();
        UI.toast('Template removido.', 'success');
        await this.load();
        await this.loadChips();
      } finally {
        UI.setLoading(confirmBtn, false);
      }
    });
  },
};
