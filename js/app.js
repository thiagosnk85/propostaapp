// ════════════════════════════════════════════
// js/app.js  ·  Inicialização do app
// ════════════════════════════════════════════

const App = {
  _initialized: false,

  async init() {
    // Load company config (needed for PDF header)
    await Config.load().catch(error => showDbError('Erro ao carregar dados da empresa', error));
    await BDI.load().catch(error => showDbError('Erro ao carregar BDI', error));

    // Check Omie connection in background
    const key    = localStorage.getItem('omie_appkey');
    const secret = localStorage.getItem('omie_appsecret');
    if (key && secret) {
      Omie.test(key, secret).then(ok => setOmieStatus(ok));
    } else {
      setOmieStatus(false);
    }

    // Load proposals list
    await Proposals.load();

    if (this._initialized) return;
    this._initialized = true;

    const refreshProposals = () => {
      if (UI.currentPage === 'propostas') {
        Proposals.load({ silent: true });
      }
    };

    window.addEventListener('focus', refreshProposals);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshProposals();
    });

    // Keyboard shortcut: Ctrl+N = nova proposta
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        UI.showPage('nova');
      }
    });
  },
};

UI.initTheme();

// Start auth flow
Auth.init();
