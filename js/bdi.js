// ════════════════════════════════════════════
// js/bdi.js  ·  BDI / Multiplicador
// ════════════════════════════════════════════

const BDI_FIELDS  = ['royalties','frete','documentacao','impostos','comissao','ct','icms','margem','over'];
const BDI_LABELS  = ['Royalties (%)','Frete/Embalagem (%)','Documentação (%)','Impostos Federais (%)','Comissão (%)','CT (%)','ICMS (%)','Margem Bruta (%)','Over (%)'];
const BDI_CATS    = ['vent','motor','serv'];
const BDI_NAMES   = { vent:'🌀 Ventilador', motor:'⚡ Motor', serv:'🔧 Serviço' };

const BDI = {
  data: {
    vent:  { royalties:5,    frete:1, documentacao:1, impostos:6.73, comissao:7, ct:0, icms:12, margem:25, over:10 },
    motor: { royalties:0,    frete:1, documentacao:1, impostos:6.73, comissao:7, ct:0, icms:12, margem:25, over:10 },
    serv:  { royalties:0,    frete:0, documentacao:1, impostos:14,   comissao:7, ct:0, icms:0,  margem:25, over:10 },
  },
  activeCategory: 'vent',

  calc(cat) {
    const b   = this.data[cat];
    const sum = BDI_FIELDS.slice(0, 8).reduce((s, f) => s + (b[f] || 0), 0);
    const min = 1 / (1 - sum / 100);
    return min * (1 / (1 - (b.over || 0) / 100));
  },

  currentMult() { return this.calc(this.activeCategory); },

  async load() {
    const cached = Cache.get('bdi');
    if (cached) { this.data = cached; }
    else {
      const { data } = await db.from('bdi_config').select('*');
      if (data?.length) {
        data.forEach(row => {
          const cat = row.categoria;
          if (this.data[cat]) {
            BDI_FIELDS.forEach(f => { if (row[f] !== undefined) this.data[cat][f] = parseFloat(row[f]); });
          }
        });
        Cache.set('bdi', this.data, 300000);
      }
    }
    this.render();
  },

  render() {
    // Summary cards
    const sum = document.getElementById('bdi-summary');
    if (sum) {
      sum.innerHTML = BDI_CATS.map(cat => `
        <div class="bdi-item">
          <div class="bdi-item-label">${BDI_NAMES[cat]}</div>
          <div class="bdi-item-value">×${this.calc(cat).toFixed(3)}</div>
        </div>`).join('');
    }
    // Forms
    const grid = document.getElementById('bdi-grid');
    if (!grid) return;
    grid.innerHTML = BDI_CATS.map(cat => `
      <div class="card m0">
        <div class="card-title">${BDI_NAMES[cat]}</div>
        ${BDI_FIELDS.map((f, i) => `
          <div class="form-group" style="margin-bottom:10px">
            <label>${BDI_LABELS[i]}</label>
            <input type="number" step="0.01" value="${this.data[cat][f] || 0}"
              oninput="BDI.update('${cat}','${f}',this.value)">
          </div>`).join('')}
        <div class="mt-2" style="font-size:13px;color:var(--muted)">
          Multiplicador: <strong style="color:var(--accent)">×<span id="mult-${cat}">${this.calc(cat).toFixed(3)}</span></strong>
        </div>
      </div>`).join('');
  },

  update(cat, field, val) {
    this.data[cat][field] = parseFloat(val) || 0;
    const el = document.getElementById('mult-' + cat);
    if (el) el.textContent = this.calc(cat).toFixed(3);
    // Update summary
    const sumItems = document.querySelectorAll('.bdi-item-value');
    BDI_CATS.forEach((c, i) => { if (sumItems[i]) sumItems[i].textContent = '×' + this.calc(c).toFixed(3); });
    Items.calcTotals();
  },

  async save() {
    const profile = await currentProfile();
    if (profile?.role !== 'admin') { UI.toast('Apenas admins podem alterar o BDI.', 'error'); return; }

    for (const cat of BDI_CATS) {
      const payload = { categoria: cat, ...this.data[cat], updated_at: new Date().toISOString() };
      await db.from('bdi_config').update(payload).eq('categoria', cat);
    }
    Cache.del('bdi');
    UI.toast('BDI salvo com sucesso!', 'success');
  },
};
