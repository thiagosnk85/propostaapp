// ============================================================
// js/pdf.js · Geracao de PDF
// ============================================================

const PDF = {
  _currentProposal: null,

  _addPageFooter(pdf, pageNumber, totalPages) {
    const proposal = this._currentProposal || {};
    const co = Config._company || {};
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setDrawColor(232, 197, 71);
    pdf.line(12, pageHeight - 15, pageWidth - 12, pageHeight - 15);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 110);
    pdf.text(`${co.nome || 'SOMAX'} | Proposta ${proposal.prop_number || '-'}`, 12, pageHeight - 10);
    pdf.text(`Pagina ${pageNumber} de ${totalPages}`, pageWidth - 12, pageHeight - 10, { align: 'right' });
  },

  preview() {
    const data = Proposals.getData();
    data._items = Items.list;
    data._alts = Items.alts;
    data.id = Proposals._editId || '';
    data.public_token = Proposals._publicToken || '';
    this._currentProposal = data;
    this.buildDoc(data);
    document.getElementById('pdf-preview').classList.add('open');
  },

  close() {
    Send._removeActionButtons();
    document.getElementById('pdf-preview').classList.remove('open');
  },

  buildDoc(p) {
    const co = Config._company || {};
    const items = p._items || [];
    const alts = p._alts || [];
    const total = p.total || items.reduce((s, it) => s + (it.quantidade || it.qtd || 1) * (it.preco_unit || it.unit || 0), 0) * (p.bdi_mult || 1);
    const publicLink = p.id && p.public_token
      ? `${APP_URL}/proposta.html?id=${encodeURIComponent(p.id)}&token=${encodeURIComponent(p.public_token)}`
      : '';

    const renderRows = (rows) => rows.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="item-tag">${escHtml(it.tag || '-')}</td>
        <td class="item-desc">${escHtml(it.descricao || it.desc || '-')}</td>
        <td style="text-align:center">${Number(it.quantidade || it.qtd || 1)}</td>
        <td style="text-align:right">${fmtBRL(it.preco_unit || it.unit || 0)}</td>
        <td style="text-align:right;font-weight:600">${fmtBRL((it.quantidade || it.qtd || 1) * (it.preco_unit || it.unit || 0))}</td>
      </tr>`).join('');

    document.getElementById('pdf-doc').innerHTML = `
    <div class="pdf-header">
      <div>
        <img src="img/logo.png" alt="SOMAX Ambiental e Acustica" class="pdf-logo-image">
        <div class="pdf-logo-details">
          ${co.cnpj ? `CNPJ: ${escHtml(co.cnpj)}<br>` : ''}
          ${escHtml(co.endereco || '')}<br>
          ${co.telefone ? `Tel: ${escHtml(co.telefone)} · ` : ''}${escHtml(co.email || '')}
        </div>
      </div>
      <div class="pdf-prop-info">
        <div class="pdf-prop-label">Proposta Comercial</div>
        <div class="pdf-prop-num">Nº ${escHtml(p.prop_number || '-')}</div>
        <div class="pdf-prop-meta">
          Data: ${fmtDate(p.created_at) || new Date().toLocaleDateString('pt-BR')}<br>
          ${p.revisao ? `Rev. ${escHtml(p.revisao)}<br>` : ''}
          ${p.n_controle ? `Controle: ${escHtml(p.n_controle)}` : ''}
        </div>
      </div>
    </div>
    <div class="pdf-accent-bar"></div>

    <div class="pdf-body">
      <div class="pdf-section">
        <div class="pdf-section-title">Dados do Cliente</div>
        <div class="pdf-client-grid">
          <div><div class="pdf-ci-label">Cliente</div><div class="pdf-ci-value">${escHtml(p.cliente || '-')}</div></div>
          ${p.attn ? `<div><div class="pdf-ci-label">A/C</div><div class="pdf-ci-value">${escHtml(p.attn)}</div></div>` : ''}
          ${p.cnpj_cliente ? `<div><div class="pdf-ci-label">CNPJ/CPF</div><div class="pdf-ci-value">${escHtml(p.cnpj_cliente)}</div></div>` : ''}
          ${p.email ? `<div><div class="pdf-ci-label">E-mail</div><div class="pdf-ci-value">${escHtml(p.email)}</div></div>` : ''}
          ${p.telefone ? `<div><div class="pdf-ci-label">Telefone</div><div class="pdf-ci-value">${escHtml(p.telefone)}</div></div>` : ''}
          ${p.ref_cliente ? `<div><div class="pdf-ci-label">Ref. Cliente</div><div class="pdf-ci-value">${escHtml(p.ref_cliente)}</div></div>` : ''}
          ${p.endereco ? `<div style="grid-column:1/-1"><div class="pdf-ci-label">Endereco</div><div class="pdf-ci-value">${escHtml(p.endereco)}</div></div>` : ''}
          ${p.cooperacao ? `<div style="grid-column:1/-1"><div class="pdf-ci-label">Cooperacao Tecnologica</div><div class="pdf-ci-value">${escHtml(p.cooperacao)}</div></div>` : ''}
        </div>
      </div>

      <div class="pdf-section">
        <div class="pdf-section-title">Apresentacao</div>
        <div class="pdf-intro">Agradecemos a oportunidade e apresentamos a seguir nossa proposta comercial${p.ref_cliente ? ` conforme referencia ${escHtml(p.ref_cliente)}` : ''} para fornecimento dos equipamentos solicitados. Nos colocamos a disposicao para quaisquer informacoes tecnicas ou comerciais adicionais.</div>
      </div>

      ${items.length ? `
      <div class="pdf-section">
        <div class="pdf-section-title">1. Escopo de Fornecimento e Precos</div>
        <table class="pdf-table">
          <thead><tr><th style="width:36px">#</th><th>Tag / Modelo</th><th>Descricao</th><th style="width:44px;text-align:center">Qtd</th><th style="width:110px;text-align:right">Unit.</th><th style="width:120px;text-align:right">Total</th></tr></thead>
          <tbody>${renderRows(items)}</tbody>
        </table>
        <div class="pdf-total-row"><div class="pdf-total-box"><div><div class="pdf-total-label">Valor Total</div><div class="pdf-total-value">${fmtBRL(total)}</div></div></div></div>
      </div>` : ''}

      ${alts.length ? `
      <div class="pdf-section">
        <div class="pdf-alt-badge">Alternativas Propostas Opcionalmente</div>
        <table class="pdf-table">
          <thead><tr><th>#</th><th>Tag / Modelo</th><th>Descricao</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${renderRows(alts)}</tbody>
        </table>
      </div>` : ''}

      <div class="pdf-section">
        <div class="pdf-section-title">Condicoes Comerciais</div>
        <div class="pdf-conditions">
          ${p.prazo_entrega ? `<div class="pdf-cond-item"><div class="pdf-cond-label">2. Prazo de Entrega</div><div class="pdf-cond-value">${escHtml(p.prazo_entrega)}</div></div>` : ''}
          ${p.cond_pagamento ? `<div class="pdf-cond-item"><div class="pdf-cond-label">3. Condicoes de Pagamento</div><div class="pdf-cond-value">${escHtml(p.cond_pagamento)}</div></div>` : ''}
          ${p.impostos ? `<div class="pdf-cond-item"><div class="pdf-cond-label">4. Impostos</div><div class="pdf-cond-value">${escHtml(p.impostos)}</div></div>` : ''}
          ${p.local_entrega ? `<div class="pdf-cond-item"><div class="pdf-cond-label">5. Local de Entrega</div><div class="pdf-cond-value">${escHtml(p.local_entrega)}</div></div>` : ''}
          ${p.validade_proposta ? `<div class="pdf-cond-item"><div class="pdf-cond-label">6. Validade</div><div class="pdf-cond-value">${escHtml(p.validade_proposta)}</div></div>` : ''}
          ${p.cond_gerais ? `<div class="pdf-cond-item" style="grid-column:1/-1"><div class="pdf-cond-label">7. Condicoes Gerais</div><div class="pdf-cond-value">${escHtml(p.cond_gerais)}</div></div>` : ''}
        </div>
      </div>

      ${p.observacoes ? `<div class="pdf-section"><div class="pdf-section-title">Observacoes</div><div class="pdf-obs-box">${escHtml(p.observacoes)}</div></div>` : ''}

      ${publicLink ? `<div class="pdf-section"><div class="pdf-section-title">Links da Proposta</div><div class="pdf-obs-box"><div><strong>Link da proposta:</strong> ${escHtml(publicLink)}</div></div></div>` : ''}

      <div class="pdf-sign-section">
        <div class="pdf-date-text">Rio de Janeiro, ${fmtDate(p.created_at) || new Date().toLocaleDateString('pt-BR')}</div>
        <div class="pdf-sign-block">
          <div class="pdf-sign-line"></div>
          <div class="pdf-sign-name">${escHtml(co.nome || 'SOMAX Ambiental & Acustica')}</div>
          <div class="pdf-sign-role">Departamento Comercial</div>
        </div>
      </div>
    </div>

    <div class="pdf-footer">
      <div class="pdf-footer-left"><strong>${escHtml(co.nome || 'SOMAX')}</strong><br>${co.cnpj ? `CNPJ: ${escHtml(co.cnpj)} · ` : ''}${escHtml(co.telefone || '')}</div>
      <div class="pdf-footer-right">Proposta Nº ${escHtml(p.prop_number || '-')}<br>Documento Confidencial</div>
    </div>`;

    if (p.id) Send._showActionButtons(p.id);
    else Send._removeActionButtons();
  },

  async download() {
    const btn = document.querySelector('.pdf-actions .btn-primary');
    if (btn) UI.setLoading(btn, true);
    UI.toast('Gerando PDF...', 'info');

    try {
      const { jsPDF } = window.jspdf;
      const docEl = document.getElementById('pdf-doc');
      const captureHost = document.createElement('div');
      captureHost.style.position = 'fixed';
      captureHost.style.left = '-10000px';
      captureHost.style.top = '0';
      captureHost.style.width = '794px';
      captureHost.style.padding = '0';
      captureHost.style.margin = '0';
      captureHost.style.background = '#ffffff';
      captureHost.style.zIndex = '-1';

      const captureDoc = docEl.cloneNode(true);
      captureDoc.style.width = '794px';
      captureDoc.style.maxWidth = 'none';
      captureDoc.style.margin = '0';
      captureDoc.style.overflow = 'visible';

      captureHost.appendChild(captureDoc);
      document.body.appendChild(captureHost);

      const canvas = await html2canvas(captureDoc, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: captureDoc.scrollWidth,
        height: captureDoc.scrollHeight,
        windowWidth: captureDoc.scrollWidth,
        windowHeight: captureDoc.scrollHeight,
      });

      document.body.removeChild(captureHost);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const footerSpace = 18;
      const usableWidth = pageWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2) - footerSpace;
      const sliceHeightPx = Math.floor((usableHeight * canvas.width) / usableWidth);
      const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHeightPx));

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) pdf.addPage();

        const startY = pageIndex * sliceHeightPx;
        const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - startY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentSliceHeight;

        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, startY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);

        const img = pageCanvas.toDataURL('image/png');
        const renderHeight = (currentSliceHeight * usableWidth) / canvas.width;
        pdf.addImage(img, 'PNG', margin, margin, usableWidth, renderHeight);
        this._addPageFooter(pdf, pageIndex + 1, totalPages);
      }

      const name = this._currentProposal?.prop_number || 'proposta';
      pdf.save(`SOMAX_Proposta_${name}.pdf`);
      UI.toast('PDF baixado!', 'success');
    } catch (e) {
      UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
    }

    if (btn) UI.setLoading(btn, false);
  },
};
