/* ============================================================
   ACCESSO — cancello davanti all'app.
   Niente registrazione dal sito: gli account si creano dalla dashboard
   Supabase. Il sito è pubblico su GitHub Pages, un form di signup
   aperto significherebbe che chiunque può farsi un account e leggere
   la traduzione (che è sotto copyright, per uso personale).
   ============================================================ */
const Auth = (() => {
  let utente = null;
  let profilo = null;

  const gate = () => document.getElementById('gate');

  function mostraGate(msg) {
    const g = gate(); if (!g) return;
    g.classList.add('on');
    document.querySelector('.app').style.display = 'none';
    if (msg) errore(msg);
  }
  function nascondiGate() {
    const g = gate(); if (g) g.classList.remove('on');
    document.querySelector('.app').style.display = '';
  }
  const errore = m => {
    const e = document.getElementById('gate-err');
    if (e) { e.textContent = m || ''; e.style.display = m ? 'block' : 'none'; }
  };

  async function entra() {
    const email = document.getElementById('gate-email').value.trim();
    const pw = document.getElementById('gate-pw').value;
    if (!email || !pw) { errore('Servono email e password'); return; }
    const btn = document.getElementById('gate-btn');
    btn.disabled = true; btn.textContent = 'Verifico…';
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    btn.disabled = false; btn.textContent = 'Entra';
    if (error) { errore(traduciErrore(error.message)); return; }
    utente = data.user;
    await caricaProfilo();
    errore('');
    nascondiGate();
    document.getElementById('gate-pw').value = '';
    if (window.onLoggato) window.onLoggato(utente);
  }

  function traduciErrore(m) {
    if (/invalid login/i.test(m)) return 'Email o password non corretti.';
    if (/email not confirmed/i.test(m)) return 'Email non ancora confermata.';
    if (/rate limit|too many/i.test(m)) return 'Troppi tentativi: aspetta un minuto.';
    return m;
  }

  async function caricaProfilo() {
    if (!utente) return null;
    const { data } = await sb.from('profili').select('*').eq('id', utente.id).maybeSingle();
    profilo = data || null;
    return profilo;
  }

  async function esci() {
    await sb.auth.signOut();
    utente = null; profilo = null;
    location.reload();
  }

  /* all'avvio: se c'è già una sessione valida si entra senza chiedere nulla */
  async function init() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) {
      utente = data.session.user;
      await caricaProfilo();
      nascondiGate();
      if (window.onLoggato) window.onLoggato(utente);
    } else {
      mostraGate();
    }
    sb.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') mostraGate();
    });
  }

  return {
    init, entra, esci, caricaProfilo,
    utente: () => utente,
    profilo: () => profilo,
    isAdmin: () => !!(profilo && profilo.ruolo === 'admin'),
    id: () => utente && utente.id,
  };
})();

/* esposto anche su window: altri script possono cercarlo lì */
window.Auth = Auth;
