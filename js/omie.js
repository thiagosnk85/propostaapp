// ============================================================
// js/omie.js  ·  Integracao Omie ERP
// ============================================================

const Omie = {
  _creds() {
    return {
      appkey: localStorage.getItem('omie_appkey') || '',
      appsecret: localStorage.getItem('omie_appsecret') || '',
    };
  },

  async _call(endpoint, call, param) {
    const { appkey, appsecret } = this._creds();
    if (!appkey || !appsecret) {
      UI.toast('Configure as credenciais do Omie em Configuracoes.', 'error');
      return null;
    }

    try {
      const res = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call, app_key: appkey, app_secret: appsecret, param: [param] }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      UI.toast('Erro Omie: ' + e.message, 'error');
      return null;
    }
  },

  async search() {
    const q = document.getElementById('omie-search')?.value?.trim();
    if (!q) return;
    const el = document.getElementById('omie-results');
    if (!el) return;
    el.innerHTML = '<div class="text-muted" style="padding:8px">Buscando...</div>';

    const data = await this._call('geral/clientes', 'ListarClientes', {
      pagina: 1,
      registros_por_pagina: 10,
      apenas_importado_api: 'N',
      clientesFiltro: { razao_social: q },
    });

    if (!data) { el.innerHTML = ''; return; }
    const lista = data.clientes_cadastro || [];
    if (!lista.length) {
      el.innerHTML = '<div class="text-muted" style="padding:8px">Nenhum cliente encontrado.</div>';
      return;
    }

    el.innerHTML = lista.map((c) => `
      <div class="omie-result-item" onclick='Omie.select(${JSON.stringify(c).replace(/'/g, '&#39;')})'>
        <div class="omie-result-name">${c.razao_social || c.nome_fantasia || '—'}</div>
        <div class="omie-result-meta">${c.cnpj_cpf || ''} · ${c.cidade || ''} / ${c.estado || ''}</div>
      </div>`).join('');

    setOmieStatus(true);
  },

  async searchItem() {
    const q = document.getElementById('omie-item-search')?.value?.trim();
    if (!q) return;
    const el = document.getElementById('omie-item-results');
    if (!el) return;
    el.innerHTML = '<div class="text-muted" style="padding:8px">Buscando itens...</div>';

    const data = await this._call('geral/produtos', 'ListarProdutos', {
      pagina: 1,
      registros_por_pagina: 10,
      apenas_importado_api: 'N',
      filtrar_apenas_omiepdv: 'N',
      produto_servico: q,
    });

    if (!data) { el.innerHTML = ''; return; }
    const lista = data.produto_servico_cadastro || data.produtos || [];
    if (!lista.length) {
      el.innerHTML = '<div class="text-muted" style="padding:8px">Nenhum item encontrado.</div>';
      return;
    }

    el.innerHTML = lista.map((item) => `
      <div class="omie-result-item" onclick='Omie.selectItem(${JSON.stringify(item).replace(/'/g, '&#39;')})'>
        <div class="omie-result-name">${item.codigo || item.codigo_produto || item.codigo_item || 'Sem codigo'}</div>
        <div class="omie-result-meta">${item.descricao || item.descricao_produto || item.nome || 'Sem descricao'} · ${fmtBRL(parseFloat(item.valor_unitario || item.preco_unitario || item.preco_venda || 0) || 0)}</div>
      </div>`).join('');

    setOmieStatus(true);
  },

  select(c) {
    const g = id => document.getElementById(id);
    const phone = c.telefone1_ddd ? `(${c.telefone1_ddd}) ${c.telefone1_numero}` : (c.telefone || '');
    const addr = [c.endereco, c.endereco_numero, c.bairro, c.cidade, c.estado].filter(Boolean).join(', ');

    if (g('f-cliente')) g('f-cliente').value = c.razao_social || c.nome_fantasia || '';
    if (g('f-cnpj')) g('f-cnpj').value = c.cnpj_cpf || '';
    if (g('f-email')) g('f-email').value = c.email || '';
    if (g('f-telefone')) g('f-telefone').value = phone;
    if (g('f-endereco')) g('f-endereco').value = addr;
    if (g('f-attn')) g('f-attn').value = c.contato || '';

    document.getElementById('omie-results').innerHTML =
      '<div style="color:var(--success);font-size:13px;padding:8px">✓ Cliente importado do Omie</div>';
    UI.toast('Cliente selecionado', 'success');
  },

  selectItem(item) {
    Items.addFromOmie(item);
    const el = document.getElementById('omie-item-results');
    if (el) {
      el.innerHTML = '<div style="color:var(--success);font-size:13px;padding:8px">✓ Item importado do Omie</div>';
    }
    UI.toast('Item selecionado', 'success');
  },

  async test(appkey, appsecret) {
    localStorage.setItem('omie_appkey', appkey);
    localStorage.setItem('omie_appsecret', appsecret);
    const data = await this._call('geral/clientes', 'ListarClientes', {
      pagina: 1,
      registros_por_pagina: 1,
      apenas_importado_api: 'N',
    });
    const ok = data && !data.faultstring;
    setOmieStatus(ok);
    return ok;
  },
};
