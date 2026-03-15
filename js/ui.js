// ════════════════════════════════════════════
// js/ui.js  ·  UI helpers e navegação
// ════════════════════════════════════════════

const UI = {
  currentPage: 'propostas',
  theme: 'dark',

  initTheme() {
    const saved = localStorage.getItem('somax_theme');
    this.applyTheme(saved === 'light' ? 'light' : 'dark');
  },

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const label = document.getElementById('theme-toggle-label');
    const sub = document.getElementById('theme-toggle-sub');
    if (label) label.textContent = theme === 'dark' ? 'Modo escuro' : 'Modo claro';
    if (sub) sub.textContent = theme === 'dark' ? 'Voltar ao visual noturno' : 'Usar cores da logo';
  },

  toggleTheme() {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('somax_theme', next);
    this.applyTheme(next);
  },

  showPage(name, options = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === name);
    });
    this.currentPage = name;

    if (name === 'propostas') Proposals.load();
    if (name === 'nova')      {
      if (!options.preserveForm) Form.reset();
      Templates.loadChips();
    }
    if (name === 'bdi')       BDI.load();
    if (name === 'templates') Templates.load();
    if (name === 'config')    Config.load();
    if (name === 'equipe')    Team.load();
    if (name === 'usuarios')  UserDirectory.load();
    if (name === 'perfil')    ProfilePage.load();
  },

  goStep(n) {
    if (n === 4) Form.fillReview();
    document.querySelectorAll('.step-panel').forEach(p => p.style.display = 'none');
    document.getElementById('step-panel-' + n).style.display = 'block';
    document.querySelectorAll('.step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === n) s.classList.add('active');
      if (i + 1 < n)  s.classList.add('done');
    });
  },

  toast(msg, type = '') {
    const t = document.getElementById('toast');
    const icons = { success: '✓ ', error: '✗ ', info: 'ℹ ' };
    t.textContent = (icons[type] || '') + msg;
    t.className = 'toast show ' + (type || '');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3500);
  },

  openModal(title, bodyHTML, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-confirm').onclick = onConfirm;
    document.getElementById('modal-confirm').style.display = 'inline-flex';
    document.getElementById('modal').classList.add('open');
  },

  closeModal() {
    document.getElementById('modal').classList.remove('open');
  },

  setLoading(btnEl, loading) {
    if (loading) {
      btnEl._orig = btnEl.innerHTML;
      btnEl.innerHTML = '<span class="spinner"></span>';
      btnEl.disabled = true;
    } else {
      btnEl.innerHTML = btnEl._orig || btnEl.innerHTML;
      btnEl.disabled = false;
    }
  },
};

// Global: update omie status indicator
function setOmieStatus(ok) {
  document.getElementById('omie-dot').className = 'dot' + (ok ? '' : ' off');
  document.getElementById('omie-status-text').textContent = ok ? 'Omie: Conectado' : 'Omie: Desconectado';
}
