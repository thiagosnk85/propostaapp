// ============================================================
// js/send.js  ·  Envio via WhatsApp e E-mail
// ============================================================

const Send = {
  getPublicLinks(id) {
    const token = PDF._currentProposal?.public_token || Proposals._publicToken || '';
    if (!token) return null;
    const query = `id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    return {
      view: `${APP_URL}/proposta.html?${query}`,
    };
  },

  email() {
    const p = PDF._currentProposal || Proposals.getData();
    const email = p.email || document.getElementById('f-email')?.value || '';
    if (!email) { UI.toast('E-mail do cliente nao informado.', 'error'); return; }

    const num = p.prop_number || document.getElementById('f-prop')?.value || '';
    const cli = p.cliente || document.getElementById('f-cliente')?.value || '';
    const comp = Config._company?.nome || 'SOMAX Ambiental & Acustica';
    const id = p.id || Proposals._editId || '';
    const links = id ? this.getPublicLinks(id) : null;

    const subject = encodeURIComponent(`Proposta Comercial SOMAX - Nº ${num}`);
    const body = encodeURIComponent(
`Prezado(a) ${cli},

Agradecemos a oportunidade e encaminhamos em anexo nossa Proposta Comercial Nº ${num}.

${links ? `Link da proposta:
${links.view}

` : ''}Colocamo-nos a disposicao para quaisquer informacoes tecnicas ou comerciais adicionais.

Atenciosamente,
Departamento Comercial
${comp}`
    );

    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    this._logEvent('sent_email');
    UI.toast('Cliente de e-mail aberto. Lembre-se de anexar o PDF.', 'info');
    this._updateStatus('enviada');
  },

  async whatsapp() {
    const p = PDF._currentProposal || Proposals.getData();
    const num = p.whatsapp || document.getElementById('f-whatsapp')?.value || '';

    if (!num) {
      UI.toast('WhatsApp do cliente nao informado.', 'error');
      return;
    }

    const propNum = p.prop_number || document.getElementById('f-prop')?.value || '';
    const cli = p.cliente || document.getElementById('f-cliente')?.value || '';
    const comp = Config._company?.nome || 'SOMAX';
    const total = p.total
      ? fmtBRL(p.total)
      : fmtBRL(Items.list.reduce((s, i) => s + i.quantidade * i.preco_unit, 0) * BDI.currentMult());
    const id = p.id || Proposals._editId || '';
    const links = id ? this.getPublicLinks(id) : null;

    const msgLines = [
      `Ola! Aqui e o departamento comercial da *${comp}*.`,
      '',
      `Segue nossa *Proposta Comercial Nº ${propNum}* preparada especialmente para ${cli}.`,
      '',
      `Valor total: *${total}*`,
      '',
      links ? 'Acesse a proposta no link abaixo para visualizar e aprovar:' : '',
      links ? links.view : '',
      '',
      'Qualquer duvida, estamos a disposicao.',
    ].filter(Boolean).join('\n');

    const waNum = num.replace(/\D/g, '');
    const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(msgLines)}`;
    window.open(waUrl, '_blank');

    this._logEvent('sent_wa');
    this._updateStatus('enviada');
    UI.toast('WhatsApp aberto com a mensagem pre-preenchida.', 'success');

    if (id) this._showActionButtons(id);
  },

  openApprovalLink() {
    const id = PDF._currentProposal?.id || Proposals._editId;
    if (!id) { UI.toast('Salve a proposta primeiro.', 'error'); return; }
    const links = this.getPublicLinks(id);
    if (!links) {
      UI.toast('Esta proposta ainda nao possui token publico. Aplique as migracoes SQL e salve a proposta novamente.', 'error');
      return;
    }
    const url = links.view;
    window.open(url, '_blank');
  },

  _showActionButtons(id) {
    const pdfActions = document.querySelector('.pdf-actions');
    if (!pdfActions || !id) return;

    const existing = pdfActions.querySelector('.btn-proposal-link');
    if (existing) return;

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-sm btn-proposal-link';
    btn.innerHTML = '🔗 Link da proposta';
    btn.onclick = () => this.openApprovalLink();
    pdfActions.appendChild(btn);
  },

  _removeActionButtons() {
    document.querySelector('.pdf-actions .btn-proposal-link')?.remove();
  },

  async _logEvent(type) {
    const id = PDF._currentProposal?.id || Proposals._editId;
    const user = await currentUser();
    if (!id || !user) return;
    await db.from('proposal_events').insert({ proposal_id: id, user_id: user.id, event_type: type });
    if (type === 'sent_email') await db.from('proposals').update({ sent_email_at: new Date().toISOString() }).eq('id', id);
    if (type === 'sent_wa') await db.from('proposals').update({ sent_wa_at: new Date().toISOString() }).eq('id', id);
  },

  async _updateStatus(status) {
    const id = PDF._currentProposal?.id || Proposals._editId;
    if (!id) return;
    await db.from('proposals').update({ status }).eq('id', id);
  },
};
