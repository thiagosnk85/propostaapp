// ════════════════════════════════════════════
// js/items.js  ·  Gestão de itens da proposta
// ════════════════════════════════════════════

const Items = {
  list: [],    // itens principais
  alts: [],    // acessorios

  reset() { this.list = []; this.alts = []; this.render(); },

  add()    { this.list.push({ tag:'', descricao:'', quantidade:1, preco_unit:0 }); this.render(); },
  addAlt() { this.alts.push({ tag:'', descricao:'', quantidade:1, preco_unit:0 }); this.render(); },

  addFromOmie(product, isAlt = false) {
    const arr = isAlt ? this.alts : this.list;
    arr.push({
      tag: product.codigo || product.codigo_produto || product.codigo_item || '',
      descricao: product.descricao || product.descricao_produto || product.nome || '',
      quantidade: 1,
      preco_unit: parseFloat(product.valor_unitario || product.preco_unitario || product.preco_venda || 0) || 0,
    });
    this.render();
  },

  remove(isAlt, i) {
    if (isAlt) this.alts.splice(i, 1); else this.list.splice(i, 1);
    this.render();
  },

  update(isAlt, i, field, val) {
    const arr = isAlt ? this.alts : this.list;
    arr[i][field] = (field === 'quantidade' || field === 'preco_unit') ? parseFloat(val) || 0 : val;
    this._updateRowTotal(isAlt, i, arr[i]);
    this.calcTotals();
  },

  _updateRowTotal(isAlt, i, item) {
    const tbodyId = isAlt ? 'alts-body' : 'items-body';
    const rows = document.getElementById(tbodyId)?.rows;
    if (rows?.[i]) rows[i].cells[5].textContent = fmtBRL(item.quantidade * item.preco_unit);
  },

  render() {
    this._renderList('items-body', this.list, false);
    this._renderList('alts-body',  this.alts,  true);
    this.calcTotals();
  },

  _renderList(tbodyId, arr, isAlt) {
    const tb = document.getElementById(tbodyId);
    if (!tb) return;
    const ia = isAlt ? 1 : 0;
    tb.innerHTML = arr.map((item, i) => `
      <tr>
        <td class="text-muted" style="font-size:12px;width:30px">${i+1}</td>
        <td><input value="${this._esc(item.tag)}" oninput="Items.update(${ia},${i},'tag',this.value)" placeholder="Tag" style="width:120px"></td>
        <td><input value="${this._esc(item.descricao)}" oninput="Items.update(${ia},${i},'descricao',this.value)" placeholder="Descrição" style="min-width:180px"></td>
        <td><input type="number" value="${item.quantidade}" min="1" oninput="Items.update(${ia},${i},'quantidade',this.value)" style="width:60px"></td>
        <td><input type="number" value="${item.preco_unit}" min="0" step="0.01" oninput="Items.update(${ia},${i},'preco_unit',this.value)" placeholder="0,00" style="width:120px"></td>
        <td style="font-weight:600;color:var(--accent);white-space:nowrap">${fmtBRL(item.quantidade*item.preco_unit)}</td>
        <td><button class="btn-ghost" onclick="Items.remove(${ia},${i})">✕</button></td>
      </tr>`).join('');
  },

  calcTotals() {
    const subMain = this.list.reduce((s, it) => s + it.quantidade * it.preco_unit, 0);
    const subAlts = this.alts.reduce((s, it) => s + it.quantidade * it.preco_unit, 0);
    const sub = subMain + subAlts;
    const bdiV  = BDI.currentMult();
    const total = sub * bdiV;
    const el = id => document.getElementById(id);
    if (el('subtotal'))   el('subtotal').textContent   = fmtBRL(sub);
    if (el('bdi-applied'))el('bdi-applied').textContent = '×' + bdiV.toFixed(3);
    if (el('total-final'))el('total-final').textContent = fmtBRL(total);
    return { sub, bdiV, total };
  },

  _esc(s) { return (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;'); },
};
