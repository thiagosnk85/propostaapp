// ============================================================
// js/proposals.js · CRUD de propostas
// ============================================================

const PAGE_SIZE = 15;

const Proposals = {
  _list: [],
  _page: 1,
  _total: 0,
  _editId: null,
  _publicToken: null,
  _loadSeq: 0,
  _isLoading: false,

  async load(options = {}) {
    const listEl = document.getElementById('proposals-list');
    const silent = options.silent === true;
    const seq = ++this._loadSeq;

    if (!silent || !this._list.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
    }
    this._isLoading = true;

    const query = this._buildQuery();
    const from = (this._page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      if (seq !== this._loadSeq) return;
      this._isLoading = false;
      UI.toast('Erro ao carregar propostas: ' + error.message, 'error');
      return;
    }
    if (seq !== this._loadSeq) return;

    this._list = data || [];
    this._total = count || 0;
    this._isLoading = false;

    this._renderList();
    this._renderPagination();
    this._loadStats();
    this._loadUserFilter();
  },

  _buildQuery() {
    let q = db.from('proposals').select('id,prop_number,cliente,email,whatsapp,status,total,created_at,created_by,profiles(name)', { count: 'exact' });
    const status = document.getElementById('filter-status')?.value;
    const user = document.getElementById('filter-user')?.value;
    if (status) q = q.eq('status', status);
    if (user) q = q.eq('created_by', user);
    return q;
  },

  search(term) {
    this._page = 1;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._searchExec(term), 350);
  },

  async _searchExec(term) {
    const listEl = document.getElementById('proposals-list');
    listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const status = document.getElementById('filter-status')?.value;
    const user = document.getElementById('filter-user')?.value;

    let q = db.from('proposals')
      .select('id,prop_number,cliente,email,whatsapp,status,total,created_at,created_by,profiles(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (term) q = q.or(`cliente.ilike.%${term}%,prop_number.ilike.%${term}%`);
    if (status) q = q.eq('status', status);
    if (user) q = q.eq('created_by', user);

    const { data, error, count } = await q;
    if (error) {
      UI.toast('Erro ao buscar propostas: ' + error.message, 'error');
      return;
    }

    this._list = data || [];
    this._total = count || 0;
    this._renderList();
    this._renderPagination();
  },

  _renderList() {
    const el = document.getElementById('proposals-list');
    if (!this._list.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div>Nenhuma proposta encontrada.</div><button class="btn btn-primary" style="margin-top:16px" onclick="UI.showPage(\'nova\')">Criar primeira proposta</button></div>';
      return;
    }

    el.innerHTML = this._list.map((p) => {
      const userName = p.profiles?.name || '-';
      const safeClientArg = JSON.stringify(p.cliente || '');
      return `
      <div class="prop-card" onclick="Proposals.openEdit('${p.id}')">
        <div><span class="prop-status ${p.status}">${p.status}</span></div>
        <div class="prop-info">
          <div class="prop-client">${escHtml(p.cliente || 'Cliente nao definido')}</div>
          <div class="prop-meta">Proposta ${escHtml(p.prop_number || '-')} · ${fmtDate(p.created_at)}</div>
          <div class="prop-user">👤 ${escHtml(userName)}</div>
        </div>
        <div class="prop-value">${fmtBRL(p.total)}</div>
        <div class="prop-actions" onclick="event.stopPropagation()">
          <button class="btn btn-outline btn-sm icon-btn edit-btn" title="Editar proposta" onclick="Proposals.openEdit('${p.id}')">✎</button>
          <button class="btn btn-outline btn-sm icon-btn delete-btn" title="Excluir proposta" onclick='Proposals.confirmDelete("${p.id}",${safeClientArg})'>🗑</button>
          <button class="btn btn-outline btn-sm" onclick="Proposals.quickPDF('${p.id}')">📄 PDF</button>
          <button class="btn btn-outline btn-sm" onclick="Proposals.openStatusMenu('${p.id}','${p.status}',this)">⚡ Status</button>
        </div>
      </div>`;
    }).join('');
  },

  _renderPagination() {
    const pages = Math.ceil(this._total / PAGE_SIZE);
    const el = document.getElementById('proposals-pagination');
    if (pages <= 1) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = Array.from({ length: pages }, (_, i) =>
      `<button class="${i + 1 === this._page ? 'active' : ''}" onclick="Proposals._goPage(${i + 1})">${i + 1}</button>`
    ).join('');
  },

  _goPage(n) {
    this._page = n;
    this.load();
    window.scrollTo(0, 0);
  },

  async _loadStats() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await db.from('proposals')
      .select('status,total')
      .gte('created_at', start);

    if (error || !data) return;
    const total = data.length;
    const aberto = data.filter((p) => p.status === 'pendente' || p.status === 'enviada').reduce((s, p) => s + (p.total || 0), 0);
    const aprov = data.filter((p) => p.status === 'aprovada').length;
    const aprovVal = data.filter((p) => p.status === 'aprovada').reduce((s, p) => s + (p.total || 0), 0);
    const taxa = total ? Math.round(aprov / total * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-value').textContent = fmtBRL(aberto);
    document.getElementById('stat-aprovadas').textContent = aprov;
    document.getElementById('stat-aprovadas-valor').textContent = fmtBRL(aprovVal);
    document.getElementById('stat-taxa').textContent = taxa + '%';
  },

  async _loadUserFilter() {
    const { data, error } = await db.from('profiles').select('id,name').order('name');
    const sel = document.getElementById('filter-user');
    if (!sel || error || !data) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Todos os usuarios</option>' +
      data.map((p) => `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('');
  },

  getData() {
    const g = (id) => document.getElementById(id)?.value?.trim() || '';
    const bdiV = BDI.currentMult();
    const subMain = Items.list.reduce((s, it) => s + it.quantidade * it.preco_unit, 0);
    const subAlts = Items.alts.reduce((s, it) => s + it.quantidade * it.preco_unit, 0);
    const sub = subMain + subAlts;
    return {
      prop_number: g('f-prop'),
      n_controle: g('f-ncontrole'),
      revisao: g('f-rev') || '0',
      cliente: g('f-cliente'),
      attn: g('f-attn'),
      cnpj_cliente: g('f-cnpj'),
      endereco: g('f-endereco'),
      telefone: g('f-telefone'),
      whatsapp: g('f-whatsapp'),
      email: g('f-email'),
      ref_cliente: g('f-ref'),
      cooperacao: g('f-coop'),
      prazo_entrega: g('f-prazo'),
      cond_pagamento: g('f-pagamento'),
      impostos: g('f-impostos'),
      local_entrega: g('f-local'),
      validade_proposta: g('f-validade'),
      cond_gerais: g('f-cond-gerais'),
      observacoes: g('f-obs'),
      subtotal: sub,
      bdi_mult: bdiV,
      total: sub * bdiV,
    };
  },

  async _saveItems(proposalId) {
    const { error: deleteItemsError } = await db.from('proposal_items').delete().eq('proposal_id', proposalId);
    if (deleteItemsError) return deleteItemsError;

    const allItems = [
      ...Items.list.map((it, i) => ({ ...it, proposal_id: proposalId, tipo: 'item', ordem: i })),
      ...Items.alts.map((it, i) => ({ ...it, proposal_id: proposalId, tipo: 'alternativa', ordem: i })),
    ];

    if (!allItems.length) return null;
    const { error: insertItemsError } = await db.from('proposal_items').insert(allItems);
    return insertItemsError || null;
  },

  async save() {
    const data = this.getData();
    if (!data.cliente) {
      UI.toast('Informe o nome do cliente.', 'error');
      return;
    }
    if (!data.prop_number) {
      UI.toast('Informe o numero da proposta.', 'error');
      return;
    }

    const user = await currentUser();
    if (!user) {
      UI.toast('Sua sessao expirou. Faca login novamente.', 'error');
      return;
    }

    const payload = { ...data, status: 'pendente', created_by: user.id };
    let proposalId = this._editId;

    if (this._editId) {
      const { error } = await db.from('proposals').update(payload).eq('id', this._editId);
      if (error) {
        UI.toast('Erro ao salvar: ' + error.message, 'error');
        return;
      }
    } else {
      const { data: created, error } = await db.from('proposals').insert(payload).select('*').single();
      if (error) {
        UI.toast('Erro ao salvar: ' + error.message, 'error');
        return;
      }
      proposalId = created.id;
      this._publicToken = created.public_token || null;
    }

    const itemsError = await this._saveItems(proposalId);
    if (itemsError) {
      UI.toast('Erro ao salvar itens: ' + itemsError.message, 'error');
      return;
    }

    const { error: eventError } = await db.from('proposal_events').insert({
      proposal_id: proposalId,
      user_id: user.id,
      event_type: this._editId ? 'updated' : 'created',
    });
    if (eventError) {
      UI.toast('Proposta salva, mas o historico falhou: ' + eventError.message, 'error');
      return;
    }

    UI.toast('Proposta salva com sucesso!', 'success');
    this._editId = null;
    UI.showPage('propostas');
  },

  async saveDraft() {
    const data = this.getData();
    if (!data.cliente) {
      UI.toast('Informe o cliente para salvar.', 'error');
      return;
    }
    data.status = 'pendente';

    const user = await currentUser();
    if (!user) {
      UI.toast('Sua sessao expirou. Faca login novamente.', 'error');
      return;
    }

    const payload = { ...data, created_by: user.id };
    const { data: draft, error } = await db.from('proposals')
      .upsert(this._editId ? { ...payload, id: this._editId } : payload)
      .select('*')
      .single();

    if (error) {
      UI.toast('Erro: ' + error.message, 'error');
      return;
    }

    this._editId = draft.id;
    this._publicToken = draft.public_token || null;

    const itemsError = await this._saveItems(draft.id);
    if (itemsError) {
      UI.toast('Rascunho salvo, mas os itens falharam: ' + itemsError.message, 'error');
      return;
    }

    UI.toast('Rascunho salvo', 'success');
  },

  async openEdit(id) {
    const { data: p, error } = await db.from('proposals').select('*').eq('id', id).single();
    if (error || !p) {
      UI.toast('Proposta nao encontrada.', 'error');
      return;
    }

    const { data: itens, error: itemsError } = await db.from('proposal_items').select('*').eq('proposal_id', id).order('ordem');
    if (itemsError) {
      UI.toast('Erro ao carregar itens: ' + itemsError.message, 'error');
      return;
    }

    this._editId = id;
    this._publicToken = p.public_token || null;
    UI.showPage('nova', { preserveForm: true });
    document.getElementById('form-title').textContent = 'Editar Proposta';

    await new Promise((r) => setTimeout(r, 50));

    const fields = {
      'f-prop': p.prop_number,
      'f-ncontrole': p.n_controle,
      'f-rev': p.revisao,
      'f-cliente': p.cliente,
      'f-attn': p.attn,
      'f-cnpj': p.cnpj_cliente,
      'f-endereco': p.endereco,
      'f-telefone': p.telefone,
      'f-whatsapp': p.whatsapp,
      'f-email': p.email,
      'f-ref': p.ref_cliente,
      'f-coop': p.cooperacao,
      'f-prazo': p.prazo_entrega,
      'f-pagamento': p.cond_pagamento,
      'f-impostos': p.impostos,
      'f-local': p.local_entrega,
      'f-validade': p.validade_proposta,
      'f-cond-gerais': p.cond_gerais,
      'f-obs': p.observacoes,
    };

    Object.entries(fields).forEach(([fid, val]) => {
      const el = document.getElementById(fid);
      if (el && val != null) el.value = val;
    });

    Items.list = (itens || []).filter((it) => it.tipo === 'item').map((it) => ({
      tag: it.tag || '',
      descricao: it.descricao || '',
      quantidade: it.quantidade,
      preco_unit: it.preco_unit,
    }));
    Items.alts = (itens || []).filter((it) => it.tipo === 'alternativa').map((it) => ({
      tag: it.tag || '',
      descricao: it.descricao || '',
      quantidade: it.quantidade,
      preco_unit: it.preco_unit,
    }));
    Items.render();
  },

  openStatusMenu(id, currentStatus) {
    const options = ['pendente', 'enviada', 'aprovada', 'cancelada', 'perdida'];
    UI.openModal(
      'Alterar Status',
      options.map((s) => `
        <button class="btn btn-outline btn-full" style="margin-bottom:8px;${s === currentStatus ? 'border-color:var(--accent);color:var(--accent)' : ''}"
          onclick="Proposals.setStatus('${id}','${s}');UI.closeModal()">
          <span class="prop-status ${s}" style="margin-right:8px">${s}</span>
        </button>`).join(''),
      () => {}
    );
    document.getElementById('modal-confirm').style.display = 'none';
  },

  async setStatus(id, status) {
    const update = { status };
    if (status === 'aprovada') update.approved_at = new Date().toISOString();
    if (status === 'cancelada') update.cancelled_at = new Date().toISOString();

    const { error } = await db.from('proposals').update(update).eq('id', id);
    if (error) {
      UI.toast('Erro: ' + error.message, 'error');
      return;
    }

    const user = await currentUser();
    if (!user) {
      UI.toast('Sua sessao expirou. Faca login novamente.', 'error');
      return;
    }

    const { error: eventError } = await db.from('proposal_events').insert({ proposal_id: id, user_id: user.id, event_type: 'status_' + status });
    if (eventError) {
      UI.toast('Status alterado, mas o historico falhou: ' + eventError.message, 'error');
    }

    UI.toast(`Status alterado para "${status}"`, 'success');
    this.load();
  },

  confirmDelete(id, cliente) {
    UI.openModal(
      'Excluir Proposta',
      `<p>Deseja realmente excluir a proposta de <strong>${escHtml(cliente || 'cliente sem nome')}</strong>?</p><p class="text-muted mt-2">Essa acao remove a proposta e os itens vinculados.</p>`,
      async () => {
        await this.delete(id);
      }
    );
  },

  async delete(id) {
    const { data, error } = await db.from('proposals').delete().eq('id', id).select('id');
    if (error) {
      UI.toast('Erro ao excluir: ' + error.message, 'error');
      return;
    }
    if (!data || !data.length) {
      UI.toast('A proposta nao foi removida. Verifique sua permissao no Supabase.', 'error');
      return;
    }

    this._list = this._list.filter((p) => p.id !== id);
    this._total = Math.max(0, this._total - 1);
    this._renderList();
    this._renderPagination();
    UI.closeModal();
    UI.toast('Proposta excluida com sucesso.', 'success');
    if (this._editId === id) this._editId = null;
    await this.load();
  },

  async quickPDF(id) {
    const { data: p } = await db.from('proposals').select('*').eq('id', id).single();
    const { data: itens } = await db.from('proposal_items').select('*').eq('proposal_id', id).order('ordem');
    if (!p) return;
    p._items = (itens || []).filter((it) => it.tipo === 'item');
    p._alts = (itens || []).filter((it) => it.tipo === 'alternativa');
    this._publicToken = p.public_token || null;
    PDF.buildDoc(p);
    document.getElementById('pdf-preview').classList.add('open');
    PDF._currentProposal = p;
  },
};

const Form = {
  reset() {
    Proposals._editId = null;
    Proposals._publicToken = null;
    document.getElementById('form-title').textContent = 'Nova Proposta';
    Items.reset();

    const yr = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 900) + 100);
    ['f-cliente', 'f-attn', 'f-cnpj', 'f-endereco', 'f-telefone', 'f-whatsapp', 'f-email',
      'f-ref', 'f-coop', 'f-prazo', 'f-pagamento', 'f-impostos', 'f-local', 'f-cond-gerais', 'f-obs']
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

    const elProp = document.getElementById('f-prop');
    const elNC = document.getElementById('f-ncontrole');
    const elRev = document.getElementById('f-rev');
    if (elProp) elProp.value = `${yr}-${num}`;
    if (elNC) elNC.value = `NC-${yr}-${num}`;
    if (elRev) elRev.value = '0';

    const elVal = document.getElementById('f-validade');
    if (elVal) elVal.value = '30 dias corridos da data de emissao';

    UI.goStep(1);
    Items.add();
    document.getElementById('omie-results').innerHTML = '';
  },

  fillReview() {
    const data = Proposals.getData();
    const total = data.total;
    const cnt = Items.list.length;
    const summaryEl = document.getElementById('rev-items-list');
    const renderRows = (rows, label) => {
      if (!rows.length) return '';
      const itemsHtml = rows.map((item, index) => {
        const qtd = Number(item.quantidade || 0);
        const unit = Number(item.preco_unit || 0);
        const lineTotal = qtd * unit;
        return `
          <div class="prop-card" style="cursor:default;margin-bottom:10px">
            <div class="prop-info">
              <div class="prop-client">${label} ${index + 1}: ${escHtml(item.tag || 'Sem codigo')}</div>
              <div class="prop-meta">${escHtml(item.descricao || 'Sem descricao')}</div>
              <div class="prop-user">Qtd: ${qtd} · Unitario: ${fmtBRL(unit)}</div>
            </div>
            <div class="prop-value">${fmtBRL(lineTotal)}</div>
          </div>`;
      }).join('');
      return `<div style="margin-bottom:14px"><div class="text-muted" style="margin-bottom:8px">${label}</div>${itemsHtml}</div>`;
    };

    document.getElementById('rev-cliente').textContent = data.cliente || '(sem cliente)';
    document.getElementById('rev-email').textContent = data.email || '';
    document.getElementById('rev-total').textContent = fmtBRL(total);
    document.getElementById('rev-itens').textContent = `${cnt} item(ns) · Proposta ${data.prop_number}`;
    if (summaryEl) {
      const html = renderRows(Items.list, 'Item') + renderRows(Items.alts, 'Alternativa');
      summaryEl.innerHTML = html || '<div class="text-muted">Nenhum item adicionado.</div>';
    }
  },
};
