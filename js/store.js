/* ============================================================
   STORE — strato dati di Addukira.  v2: Supabase.

   Il patto con app.js non cambia: i getter restano SINCRONI e leggono
   da una cache in memoria. Solo `init()` è async — carica tutto una
   volta all'accesso. Le scritture aggiornano subito la cache e partono
   verso il database in sottofondo (scrittura ottimistica): l'interfaccia
   non aspetta mai la rete.

   Il Corano non entra tutto in memoria: 6236 versetti si caricano a
   finestre, attorno a dove stai leggendo.
   ============================================================ */

/* I momenti della giornata: non etichette generiche ma fasce vere, agganciate
   alle preghiere. `da` e `a` sono {preghiera, offset in minuti}; la fascia va
   dall'inizio (compreso) alla fine (esclusa), e la notte scavalca mezzanotte.
   `tutto_giorno` non è una fascia: è la colonna che resta ferma fino a Maghrib. */
const MOMENTI = [
  { k: 'risveglio',     t: 'Risveglio',     q: 'da 20 min prima del Fajr a dopo Shurūq', ico: '🌅',
    da: { p: 'fajr', off: -20 }, a: { p: 'shuruq', off: 20 } },
  { k: 'mattino',       t: 'Mattino',       q: "dall'alba a Ẓuhr", ico: '☀️',
    da: { p: 'shuruq', off: 20 }, a: { p: 'zuhr', off: 0 } },
  { k: 'pomeriggio',    t: 'Pomeriggio',    q: 'da Ẓuhr a ʿAṣr', ico: '🌤️',
    da: { p: 'zuhr', off: 0 }, a: { p: 'asr', off: 0 } },
  { k: 'fine_giornata', t: 'Fine giornata', q: 'da ʿAṣr a Maghrib', ico: '🌇',
    da: { p: 'asr', off: 0 }, a: { p: 'maghrib', off: 0 } },
  { k: 'sera',          t: 'Sera',          q: 'da Maghrib a ʿIshāʾ', ico: '🌆',
    da: { p: 'maghrib', off: 0 }, a: { p: 'isha', off: 0 } },
  { k: 'notte',         t: 'Notte',         q: 'da ʿIshāʾ a Fajr', ico: '🌙',
    da: { p: 'isha', off: 0 }, a: { p: 'fajr', off: -20 } },
  { k: 'tutto_giorno',  t: 'Tutto il giorno', q: 'resta fino a Maghrib', ico: '🔁', sempre: true },
];

const PREGHIERE = [
  { k: 'fajr', t: 'Fajr' }, { k: 'shuruq', t: 'Shurūq' }, { k: 'zuhr', t: 'Ẓuhr' },
  { k: 'asr', t: 'ʿAṣr' }, { k: 'maghrib', t: 'Maghrib' }, { k: 'isha', t: "ʿIshāʾ" },
];

/* versetti per sura (Ḥafṣ). Resta qui: serve a calcolare senza interrogare il DB. */
const VERSI_SURA = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const TOTALE_AYA = 6236;

/* prima aya di ognuno dei 30 juz [sura, aya] — dato canonico */
const JUZ_START = [[1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],
[7,88],[8,41],[9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],
[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],
[58,1],[67,1],[78,1]];

/* impostazioni di partenza: restano locali finché non le salvi */
const SETTINGS_DEFAULT = {
  /* UTC è il riferimento: gli orari si leggono sempre lì, e accanto
     compare l'ora locale del calendario in uso. */
  tempo: { fuso: 'UTC', fusi_extra: ['Europe/Rome', 'Africa/Casablanca'], formato: '24h', hijri_mostra: true, hijri_offset: 0 },
  preghiere: {
    luoghi: [{ id: 1, nome: 'Casablanca', lat: 33.5731, lon: -7.5898, tz: 'Africa/Casablanca' }],
    luogo_attivo: 1, cambio: 'manuale',
    correzioni: { fajr: 0, shuruq: 0, zuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    mostra: { fajr: true, shuruq: true, zuhr: true, asr: true, maghrib: true, isha: true },
  },
  vista: {
    widget: { arco: true, marea: true, luna: true },
    lettore: 'flusso', memorizzatore: 'pagina',
    sezioni: {}, momenti: { risveglio: true, mattino: true, pomeriggio: true, fine_giornata: true, sera: true, notte: true, tutto_giorno: true },
  },
};

const LANG_KEY = 'addukira-lang';

const store = (() => {
  /* ---- cache in memoria: è ciò che i getter sincroni leggono ---- */
  let DB = {
    sure: [], ayat: [], voci: [], hadith: [], adhkar: [], asma: [], fonti: [], ricorrenze: [],
    pensieri: [], legami: [], attivita: [], khatam: [], piani_mem: [],
    memorizzato: [], evidenziazioni: [], spunte: {},
    impostazioni: structuredClone(SETTINGS_DEFAULT),
    studio: { piano: 'annuale', hizb: 1, rubu: 1 },
  };
  let LANG = 'it';
  try { LANG = localStorage.getItem(LANG_KEY) || 'it'; } catch (e) {}

  /* le schede di studio sono tutte `voci`, distinte dal tipo */
  const TIPO_VOCE = {
    personaggi: 'personaggio', storie: 'storia', temi: 'tema', fiqh: 'fiqh',
    azioni: 'azione', segni_ora: 'segno_ora', creazione: 'creazione', luoghi: 'luogo',
  };

  /* ---- utilità ---- */
  function deepMerge(target, patch) {
    for (const k in patch) {
      const v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        deepMerge(target[k], v);
      } else target[k] = v;
    }
    return target;
  }
  function fillDefaults(target, def) {
    for (const k in def) {
      const d = def[k];
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        fillDefaults(target[k], d);
      } else if (target[k] === undefined) target[k] = structuredClone(d);
    }
  }
  const hm2min = s => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const t2hm = t => t ? String(t).slice(0, 5) : '';
  /* ripiego, usato solo se per oggi non c'è il calendario della moschea */
  const PREG_FALLBACK = { fajr: 230, shuruq: 340, zuhr: 800, asr: 1035, maghrib: 1255, isha: 1355 };

  /* minuti dopo mezzanotte di una data letta in un certo fuso */
  const minutiInTz = (d, tz) => {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
      return (+p.find(x => x.type === 'hour').value) * 60 + (+p.find(x => x.type === 'minute').value);
    } catch (e) { return d.getHours() * 60 + d.getMinutes(); }
  };
  /* di quanti minuti tzB è avanti rispetto a tzA, in quella data */
  function scartoFusi(tzA, tzB, giorno) {
    if (!tzA || !tzB || tzA === tzB) return 0;
    const d = new Date(giorno + 'T12:00:00Z');
    let x = minutiInTz(d, tzB) - minutiInTz(d, tzA);
    if (x > 720) x -= 1440;
    if (x < -720) x += 1440;
    return x;
  }

  /* orari del giorno dal calendario, già portati nel fuso in cui vivi */
  let orariGiorno = null;   /* { fajr: min, ..., fonte, fonte_nome, tz_origine, scarto } */

  function hijriParts(d) {
    for (const cal of ['en-u-ca-islamic-umalqura', 'en-u-ca-islamic']) {
      try {
        const p = new Intl.DateTimeFormat(cal, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
        const g = t => (p.find(x => x.type === t) || {}).value;
        const m = +g('month');
        if (m >= 1 && m <= 12) return { g: +g('day'), m, y: +g('year') };
      } catch (e) {}
    }
    return null;
  }
  function ricorre(a, d) {
    const r = a.ricorrenza || { tipo: 'quotidiana' };
    if (r.tipo === 'quotidiana') return true;
    if (r.tipo === 'settimanale') return (r.giorni || []).includes(d.getDay());
    const h = hijriParts(d);
    if (!h) return true;
    if (r.tipo === 'mensile_hijri') return (r.giorni || []).includes(h.g);
    if (r.tipo === 'annuale_hijri') {
      if (+r.mese !== h.m) return false;
      if (r.giorno) return h.g === +r.giorno;
      if (r.conteggio) return h.g <= +r.conteggio;
      return true;
    }
    return true;
  }

  /* ---- scrittura ottimistica: la cache cambia subito, il DB insegue ---- */
  const inVolo = new Set();
  function salva(tabella, riga, chiave) {
    const p = sb.from(tabella).upsert(riga, chiave ? { onConflict: chiave } : undefined)
      .then(({ error }) => { if (error) console.error('[store] salvataggio', tabella, error.message); });
    inVolo.add(p); p.finally(() => inVolo.delete(p));
    return p;
  }
  function cancella(tabella, filtro) {
    let q = sb.from(tabella).delete();
    for (const k in filtro) q = q.eq(k, filtro[k]);
    return q.then(({ error }) => { if (error) console.error('[store] eliminazione', tabella, error.message); });
  }
  /* Ritocca colonne di una riga che esiste già. Serve dove l'upsert non va bene:
     le tabelle canoniche hanno colonne NOT NULL che non vogliamo rimandare tutte
     per cambiarne una. */
  function aggiorna(tabella, patch, filtro) {
    let q = sb.from(tabella).update(patch);
    for (const k in filtro) q = q.eq(k, filtro[k]);
    const p = q.then(({ error }) => { if (error) console.error('[store] aggiornamento', tabella, error.message); });
    inVolo.add(p); p.finally(() => inVolo.delete(p));
    return p;
  }
  /* `Auth` è un const di script: NON esiste come window.Auth.
     Cercarlo lì lo rendeva sempre null, e init() saltava tutti i dati personali. */
  const uid = () => (typeof Auth !== 'undefined' && Auth.id()) || null;
  const nuovoId = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));

  /* ============================================================
     INIT — l'unica funzione async. Carica tutto, una volta.
     ============================================================ */
  async function init() {
    const me = uid();
    const [sure, voci, hadith, adhkar, asma, fonti, ricorrenze] = await Promise.all([
      sb.from('sure').select('*').order('numero'),
      sb.from('voci').select('*').order('ordine'),
      sb.from('hadith').select('*'),
      sb.from('adhkar').select('*'),
      sb.from('asma').select('*').order('numero'),
      sb.from('fonti').select('*'),
      sb.from('ricorrenze').select('*'),
    ]);
    /* sure e asma hanno una chiave naturale (`numero`): l'alias `id` evita
       di toccare tutti i punti in cui app.js scrive x.id */
    DB.sure = (sure.data || []).map(s => ({ ...s, id: s.numero }));
    DB.asma = (asma.data || []).map(a => ({ ...a, id: a.numero }));
    DB.voci = voci.data || [];
    DB.hadith = hadith.data || [];
    DB.adhkar = adhkar.data || [];
    DB.fonti = fonti.data || [];
    DB.ricorrenze = ricorrenze.data || [];

    if (me) {
      const [pensieri, legami, attivita, khatam, piani, mem, evid, imp, spunte] = await Promise.all([
        sb.from('pensieri').select('*').order('giorno', { ascending: true }),
        sb.from('legami').select('*'),
        sb.from('attivita').select('*').order('ordine'),
        sb.from('khatam').select('*').order('numero'),
        sb.from('piani_mem').select('*'),
        sb.from('memorizzazione').select('*'),
        sb.from('evidenziazioni').select('*'),
        sb.from('impostazioni').select('*').eq('user_id', me).maybeSingle(),
        sb.from('spunte').select('*').gte('giorno', giorniFa(40)),
      ]);
      DB.pensieri = pensieri.data || [];
      DB.legami = legami.data || [];
      DB.attivita = (attivita.data || []).map(a => ({ ...a, ora: t2hm(a.ora) }));
      DB.khatam = khatam.data || [];
      DB.piani_mem = piani.data || [];
      DB.memorizzato = mem.data || [];
      DB.evidenziazioni = evid.data || [];
      DB.impostazioni = (imp.data && imp.data.dati) || {};
      fillDefaults(DB.impostazioni, SETTINGS_DEFAULT);
      DB.spunte = {};
      (spunte.data || []).forEach(s => {
        DB.spunte[s.giorno] = DB.spunte[s.giorno] || {};
        DB.spunte[s.giorno][s.attivita_id] = s.stato;
      });
    }

    if (me) await caricaOrari();

    /* la finestra di Corano attorno al segnalibro */
    const k = DB.khatam.find(x => x.stato === 'attivo');
    await caricaAyat({ centro: (k && k.aya_id) || 1 });
  }

  /* il foglio della moschea per oggi. Se non c'è, si resta al calcolo. */
  async function caricaOrari(giorno) {
    orariGiorno = null;
    const me = uid(); if (!me) return null;
    giorno = giorno || oggiNelFuso();
    const { data, error } = await sb.from('orari_preghiera')
      .select('*').eq('data', giorno).limit(1).maybeSingle();
    if (error || !data) return null;

    /* gli orari sono scritti nel fuso della moschea che ha stampato il foglio:
       se vivi altrove vanno spostati, o Maghrib arriva un'ora sbagliata. */
    const tzApp = DB.impostazioni.tempo.fuso;
    const scarto = scartoFusi(data.tz_origine, tzApp, giorno);
    orariGiorno = { fonte: data.fonte, fonte_nome: data.fonte_nome, tz_origine: data.tz_origine, scarto, data: giorno };
    ['fajr', 'shuruq', 'zuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
      orariGiorno[k] = data[k] ? hm2min(t2hm(data[k])) + scarto : null;
    });
    return orariGiorno;
  }

  function oggiNelFuso() {
    const tz = DB.impostazioni.tempo.fuso;
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  }

  const giorniFa = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  /* carica una finestra di versetti: attorno a un punto, o una sura intera */
  let finestra = { da: 0, a: 0 };
  let finestraSura = null;   /* numero di sura, se la finestra e' una sura intera */
  let ayeExtra = [];         /* ayat aperte dalla ricerca, fuori dalla finestra corrente */
  async function caricaAyat({ centro, sura, da, a, quanti = 60 } = {}) {
    let q = sb.from('ayat').select('*').order('id');
    if (sura) { q = q.eq('sura', sura); finestra = { da: 0, a: 0 }; finestraSura = +sura; }
    else {
      const i = Math.max(1, (da || centro || 1));
      const f = Math.min(TOTALE_AYA, a || (i + quanti - 1));
      q = q.gte('id', i).lte('id', f);
      finestra = { da: i, a: f }; finestraSura = null;
    }
    const { data, error } = await q;
    if (error) { console.error('[store] ayat', error.message); return []; }
    /* alias: nel DB i campi si chiamano sura/numero/testo_ar, app.js li conosce
       come sura_id/aya/arabo. Meglio due alias che riscrivere il rendering. */
    DB.ayat = (data || []).map(x => ({ ...x, sura_id: x.sura, aya: x.numero, arabo: x.testo_ar }));
    /* traduzioni della finestra, se ho accesso */
    if (DB.ayat.length) {
      const ids = DB.ayat.map(x => x.id);
      const { data: tr } = await sb.from('ayat_traduzioni').select('aya_id,testo').in('aya_id', ids).eq('lang', 'it');
      const mappa = {};
      (tr || []).forEach(t => { mappa[t.aya_id] = t.testo; });
      /* `it` per il lettore, `traduzione` per le schede e la ricerca:
         due nomi per lo stesso testo, così nessuna pagina resta a secco. */
      DB.ayat.forEach(x => { x.it = mappa[x.id] || ''; x.traduzione = x.it; });
    }
    return DB.ayat;
  }

  return {
    init, caricaAyat,
    momenti: MOMENTI,
    preghiere: PREGHIERE,
    pronto: () => DB.sure.length > 0,

    getLang: () => LANG,
    setLang(l) { LANG = (l === 'ar') ? 'ar' : 'it'; try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {} },

    /* ---- impostazioni ---- */
    getSettings: () => DB.impostazioni,
    setSettings(patch) {
      deepMerge(DB.impostazioni, patch);
      const me = uid();
      if (me) salva('impostazioni', { user_id: me, dati: DB.impostazioni, modificato_il: new Date().toISOString() }, 'user_id');
    },
    nowMin(tz) {
      tz = tz || DB.impostazioni.tempo.fuso;
      try {
        const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        return (+p.find(x => x.type === 'hour').value) * 60 + (+p.find(x => x.type === 'minute').value);
      } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
    },
    fmtHM(min) {
      min = ((Math.round(min) % 1440) + 1440) % 1440;
      const h = Math.floor(min / 60), m = min % 60;
      if (DB.impostazioni.tempo.formato === '12h') {
        const ap = h < 12 ? 'AM' : 'PM'; let hh = h % 12; if (hh === 0) hh = 12;
        return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
      }
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    },

    /* ---- accesso generico (stessa firma di prima) ---- */
    list(t) {
      if (TIPO_VOCE[t]) return DB.voci.filter(v => v.tipo === TIPO_VOCE[t]);
      if (t === 'versetti' || t === 'ayat_demo') return DB.ayat;
      return DB[t] || [];
    },
    get(t, id) {
      if (t === 'sure') return DB.sure.find(x => String(x.numero) === String(id));
      if (t === 'asma') return DB.asma.find(x => String(x.numero) === String(id));
      const trovato = (this.list(t) || []).find(x => String(x.id) === String(id));
      if (trovato) return trovato;
      /* un versetto aperto dalla ricerca puo' stare fuori dalla finestra */
      if (t === 'versetti' || t === 'ayat_demo') return ayeExtra.find(x => String(x.id) === String(id));
      return undefined;
    },
    /* tiene da parte un'aya aperta fuori finestra, cosi' la scheda la trova */
    ricordaAya(riga) {
      if (!riga) return;
      if (!ayeExtra.some(x => x.id === riga.id)) ayeExtra.push(riga);
      if (ayeExtra.length > 40) ayeExtra.shift();
    },
    add(t, row) {
      const tabella = TIPO_VOCE[t] ? 'voci' : t;
      const r = { id: nuovoId(), ...row };
      if (TIPO_VOCE[t]) r.tipo = TIPO_VOCE[t];
      if (tabella === 'voci') DB.voci.push(r); else (DB[t] = DB[t] || []).push(r);
      salva(tabella, r);
      return r;
    },

    /* ---- collegamenti di una scheda qualsiasi ----
       Si leggono nei DUE versi: chi ha creato il legame non conta, conta che
       le due schede si vedano. Per SCRIVERLO invece serve un verso solo, se no
       lo stesso collegamento finirebbe in tabella due volte a seconda della
       scheda da cui lo crei. Questo è l'ordine: chi viene prima sta a sinistra
       della freccia. Un'azione «nasce da» un hadith, un pensiero «nasce da»
       tutto il resto — ed è così che le schede già scritte se li ritrovano. */
    _versi: ['pensiero', 'azione', 'hadith', 'personaggio', 'storia', 'tema', 'fiqh',
             'versetto', 'sura', 'asma'],
    _relazione(da, a) {
      if (da === 'pensiero') return 'nato_da';
      if (da === 'azione' && a === 'hadith') return 'fondata_su';
      return 'collegato';
    },
    ancoreDiCosa(tipo, id) {
      const out = [];
      DB.legami.forEach(l => {
        if (this._etichette.includes(l.da_tipo) || this._etichette.includes(l.a_tipo)) return;
        if (l.da_tipo === tipo && String(l.da_id) === String(id))
          out.push({ legame_id: l.id, tipo: l.a_tipo, target: l.a_id });
        else if (l.a_tipo === tipo && String(l.a_id) === String(id))
          out.push({ legame_id: l.id, tipo: l.da_tipo, target: l.da_id });
      });
      return out;
    },
    /* `gestiti` = i tipi che il modale chiamante sa maneggiare. Tutto ciò che
       resta fuori (per esempio i pensieri appesi a un hadith) non viene toccato:
       non essendo nella lista non significa che vada cancellato. */
    setAncoreDiCosa(tipo, id, ancore, gestiti) {
      const nuove = (ancore || []).filter(a => a && a.tipo && a.id);
      const chiave = a => a.tipo + '|' + a.id;
      const restano = new Set(nuove.map(chiave));
      const vecchie = this.ancoreDiCosa(tipo, id);
      vecchie.forEach(a => {
        if (gestiti && !gestiti.includes(a.tipo)) return;
        if (!restano.has(a.tipo + '|' + a.target)) this.scollega(a.legame_id);
      });
      const gia = new Set(vecchie.map(a => a.tipo + '|' + a.target));
      nuove.forEach(a => {
        if (gia.has(chiave(a))) return;
        const mio = this._versi.indexOf(tipo), suo = this._versi.indexOf(a.tipo);
        const primaIo = mio >= 0 && (suo < 0 || mio <= suo);
        if (primaIo) this.collega(tipo, id, a.tipo, a.id, this._relazione(tipo, a.tipo));
        else this.collega(a.tipo, a.id, tipo, id, this._relazione(a.tipo, tipo));
      });
    },

    /* ---- schede di studio (tabella `voci`): correggere e togliere ---- */
    editVoce(id, patch) {
      const v = DB.voci.find(x => String(x.id) === String(id));
      if (!v) return null;
      Object.assign(v, patch);
      aggiorna('voci', patch, { id: v.id });
      return v;
    },
    delVoce(id) {
      const i = DB.voci.findIndex(x => String(x.id) === String(id));
      if (i < 0) return false;
      const tipo = DB.voci[i].tipo;
      DB.legami.filter(l => (l.da_tipo === tipo && String(l.da_id) === String(id))
        || (l.a_tipo === tipo && String(l.a_id) === String(id)))
        .map(l => l.id).forEach(lid => this.scollega(lid));
      DB.voci.splice(i, 1);
      cancella('voci', { id });
      return true;
    },

    /* ---- hadith: correggere e togliere ---- */
    editHadith(id, patch) {
      const h = DB.hadith.find(x => String(x.id) === String(id));
      if (!h) return null;
      Object.assign(h, patch);
      aggiorna('hadith', patch, { id: h.id });
      return h;
    },
    /* via l'hadith e via tutti i fili che lo toccano: tag, personaggi che lo
       riportano, azioni che ne nascono, pensieri nati da lì */
    delHadith(id) {
      const i = DB.hadith.findIndex(x => String(x.id) === String(id));
      if (i < 0) return false;
      DB.legami.filter(l => (l.da_tipo === 'hadith' && String(l.da_id) === String(id))
        || (l.a_tipo === 'hadith' && String(l.a_id) === String(id)))
        .map(l => l.id).forEach(lid => this.scollega(lid));
      DB.hadith.splice(i, 1);
      cancella('hadith', { id });
      return true;
    },

    /* ---- fonti: le raccolte e le opere da cui si cita ----
       Stanno nel layer canonico: si scrivono una volta e poi si pescano
       da lì, invece di riscrivere «Bukhārī» a ogni hadith. */
    fontiDiTipo(tipo) {
      return DB.fonti.filter(f => !tipo || f.tipo === tipo)
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
    },
    addFonte(nome, tipo, nota) {
      const v = String(nome || '').trim();
      if (!v) return null;
      const gia = DB.fonti.find(f => String(f.nome).toLowerCase() === v.toLowerCase());
      if (gia) return gia;
      const f = { id: nuovoId(), tipo: tipo || 'raccolta', nome: v, autore_id: null, nota: nota || null };
      DB.fonti.push(f); salva('fonti', f);
      return f;
    },
    delFonte(id) {
      const i = DB.fonti.findIndex(f => String(f.id) === String(id));
      if (i < 0) return false;
      DB.fonti.splice(i, 1);
      cancella('fonti', { id });
      return true;
    },
    /* quanti hadith citano questa raccolta: serve a non cancellarla per sbaglio */
    usiDiFonte(nome) {
      const n = String(nome || '').trim();
      return DB.hadith.filter(h => String(h.raccolta || '').split(/,| e /)
        .map(s => s.trim()).includes(n)).length;
    },

    /* ---- attività del giorno ---- */
    today() {
      const tz = DB.impostazioni.tempo.fuso;
      try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
      catch (e) {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
    },
    stato(id) { const g = DB.spunte[this.today()]; return (g && g[id]) || null; },
    setStato(id, stato) {
      const d = this.today(), me = uid();
      DB.spunte[d] = DB.spunte[d] || {};
      if (!stato || DB.spunte[d][id] === stato) {
        delete DB.spunte[d][id];
        if (me) cancella('spunte', { user_id: me, attivita_id: id, giorno: d });
      } else {
        DB.spunte[d][id] = stato;
        if (me) salva('spunte', { user_id: me, attivita_id: id, giorno: d, stato }, 'user_id,attivita_id,giorno');
      }
    },
    statoEff(a) {
      const s = this.stato(a.id);
      if (s) return s;
      if (a.verso === 'evitare') return null;      /* le cose da evitare non scadono */
      const om = this.oraMin(a);
      if (om != null && this.nowMin() > om) return 'auto';
      /* senza orario è la fascia a decidere: passata la sua finestra, è persa.
         Quelle di tutto il giorno reggono fino al Maghrib. */
      const m = MOMENTI.find(x => x.k === a.momento);
      if (m && this.fasciaStato(m) === 'passato') return 'auto';
      return null;
    },
    isDone(id) { return this.stato(id) === 'fatto'; },
    toggle(id) { this.setStato(id, this.stato(id) === 'fatto' ? null : 'fatto'); },
    setOra(id, ora) { this.updAttivita(id, { ora: ora || '', ancora: ora ? 'ora_fissa' : 'libera' }); },

    /* ---- orari di preghiera ---- */
    caricaOrari,
    orariOggi: () => orariGiorno,
    /* i sei orari in minuti: dal calendario se c'è, altrimenti il ripiego */
    preghieraMin(k) {
      if (orariGiorno && orariGiorno[k] != null) return orariGiorno[k];
      return PREG_FALLBACK[k] != null ? PREG_FALLBACK[k] : null;
    },
    fonteOrari: () => orariGiorno
      ? { testo: orariGiorno.fonte_nome || 'calendario', scarto: orariGiorno.scarto, tz: orariGiorno.tz_origine }
      : { testo: 'calcolo di riserva', scarto: 0, tz: null },

    /* i sei orari in doppia lettura: nel fuso in cui ragioni (UTC) e
       insieme com'è stampato sul foglio della moschea. */
    orariDoppi() {
      const tzApp = DB.impostazioni.tempo.fuso;
      const tzCal = orariGiorno ? orariGiorno.tz_origine : null;
      const scarto = orariGiorno ? (orariGiorno.scarto || 0) : 0;
      const doppio = tzCal && tzCal !== tzApp;
      return PREGHIERE.map(p => {
        const m = this.preghieraMin(p.k);
        if (m == null) return null;
        return {
          k: p.k, nome: p.t,
          ora: this.fmtHM(m),                        /* nel tuo fuso */
          oraCal: doppio ? this.fmtHM(m - scarto) : null,   /* come sul calendario */
          tzApp, tzCal,
        };
      }).filter(Boolean);
    },
    /* etichetta breve di un fuso: "UTC", "Rome", "Casablanca" */
    tzBreve: tz => tz === 'UTC' ? 'UTC' : String(tz || '').split('/').pop().replace('_', ' '),

    /* ---- le fasce della giornata ----
       Inizio e fine di una fascia, in minuti dopo mezzanotte. */
    momentoMin(m, capo) {
      const b = m[capo];
      if (!b) return null;
      const base = this.preghieraMin(b.p);
      if (base == null) return null;
      return base + (b.off || 0) + (DB.impostazioni.preghiere.correzioni[b.p] || 0);
    },
    /* la fascia in cui siamo adesso. La notte scavalca mezzanotte, quindi
       vale sia dopo ʿIshāʾ sia prima del Fajr del giorno dopo. */
    momentoOra() {
      const ora = this.nowMin();
      const fasce = MOMENTI.filter(m => !m.sempre);
      for (const m of fasce) {
        const d = this.momentoMin(m, 'da'), a = this.momentoMin(m, 'a');
        if (d == null || a == null) continue;
        if (d <= a ? (ora >= d && ora < a) : (ora >= d || ora < a)) return m.k;
      }
      return 'notte';
    },
    /* 'passato' | 'ora' | 'futuro' — serve a far scorrere la colonna con la giornata */
    fasciaStato(m) {
      if (m.sempre) return this.nowMin() >= (this.preghieraMin('maghrib') || 1e9) ? 'passato' : 'ora';
      const corrente = this.momentoOra();
      const ordine = MOMENTI.filter(x => !x.sempre).map(x => x.k);
      const i = ordine.indexOf(m.k), c = ordine.indexOf(corrente);
      if (i === c) return 'ora';
      return i < c ? 'passato' : 'futuro';
    },
    /* a che ora comincia e finisce, già scritto */
    fasciaOrario(m) {
      if (m.sempre) return '';
      const d = this.momentoMin(m, 'da'), a = this.momentoMin(m, 'a');
      if (d == null || a == null) return '';
      return this.fmtHM(d) + ' → ' + this.fmtHM(a);
    },

    oraMin(a) {
      if (a.ancora === 'ora_fissa' && a.ora) return hm2min(a.ora);
      if (a.ancora === 'preghiera' && a.preghiera) {
        const b = this.preghieraMin(a.preghiera);
        if (b != null) return b + (+a.offset_min || 0) + (DB.impostazioni.preghiere.correzioni[a.preghiera] || 0);
      }
      return null;
    },
    oraLabel(a) {
      if (a.ancora === 'ora_fissa' && a.ora) return this.fmtHM(hm2min(a.ora));
      if (a.ancora === 'preghiera' && a.preghiera) {
        const pr = PREGHIERE.find(p => p.k === a.preghiera);
        const off = +a.offset_min || 0;
        return (pr ? pr.t : a.preghiera) + (off ? (off > 0 ? ' +' : ' ') + off + '′' : '');
      }
      return '';
    },
    ricLabel(a) {
      const r = a.ricorrenza || { tipo: 'quotidiana' };
      const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
      const MH = ['Muḥarram','Ṣafar','Rabīʿ I','Rabīʿ II','Jumādā I','Jumādā II','Rajab','Shaʿbān','Ramaḍān','Shawwāl','Dhū al-qaʿda','Dhū al-ḥijja'];
      if (r.tipo === 'settimanale') return 'ogni ' + (r.giorni || []).map(g => GG[g]).join(', ');
      if (r.tipo === 'mensile_hijri') return 'giorni ' + (r.giorni || []).join('-') + ' di ogni mese hijri';
      if (r.tipo === 'annuale_hijri') {
        const m = MH[(+r.mese || 1) - 1];
        if (r.giorno) return r.giorno + ' ' + m;
        if (r.conteggio) return r.conteggio + ' giorni di ' + m;
        return 'tutto ' + m;
      }
      return 'ogni giorno';
    },
    attivitaOggi() {
      const oggi = this.today(), d = new Date(oggi + 'T12:00:00');
      return DB.attivita
        .filter(a => a.attiva !== false && (!a.inizio || a.inizio <= oggi) && (!a.fine || a.fine >= oggi) && ricorre(a, d))
        .sort((x, y) => (x.ordine || 0) - (y.ordine || 0));
    },
    addAttivita(o) {
      const a = Object.assign({
        id: nuovoId(), user_id: uid(), azione_id: null, adhkar_id: null, nome: '', verso: 'fare',
        momento: 'risveglio', ancora: 'libera', ora: '', preghiera: null, offset_min: 0,
        ricorrenza: { tipo: 'quotidiana' }, inizio: this.today(), fine: null, attiva: true,
        ripetizioni: '', ordine: DB.attivita.length,
      }, o);
      DB.attivita.push(a);
      salva('attivita', perDB(a));
      return a;
    },
    updAttivita(id, patch) {
      const a = DB.attivita.find(x => String(x.id) === String(id));
      if (a) { Object.assign(a, patch); salva('attivita', perDB(a)); }
      return a;
    },
    delAttivita(id) {
      const i = DB.attivita.findIndex(x => String(x.id) === String(id));
      if (i >= 0) { DB.attivita.splice(i, 1); cancella('attivita', { id }); }
    },
    attivitaDiAzione(azioneId) { return DB.attivita.filter(a => String(a.azione_id) === String(azioneId)); },

    /* ---- legami ---- */
    collega(da_tipo, da_id, a_tipo, a_id, relazione) {
      const esiste = DB.legami.some(l => l.da_tipo === da_tipo && String(l.da_id) === String(da_id)
        && l.a_tipo === a_tipo && String(l.a_id) === String(a_id));
      if (esiste) return null;
      const l = { id: nuovoId(), user_id: uid(), da_tipo, da_id: String(da_id), a_tipo, a_id: String(a_id), relazione: relazione || 'collegato' };
      DB.legami.push(l); salva('legami', l);
      return l;
    },
    scollega(id) {
      const i = DB.legami.findIndex(l => String(l.id) === String(id));
      if (i >= 0) { DB.legami.splice(i, 1); cancella('legami', { id }); }
    },
    collegatiA(tipo, id, verso) {
      const out = [];
      DB.legami.forEach(l => {
        if (l.da_tipo === tipo && String(l.da_id) === String(id) && l.a_tipo === verso) out.push({ legame: l, id: l.a_id });
        else if (l.a_tipo === tipo && String(l.a_id) === String(id) && l.da_tipo === verso) out.push({ legame: l, id: l.da_id });
      });
      return out;
    },

    /* ---- pensieri ---- */
    /* le etichette viaggiano negli stessi legami ma non sono ancore: fuori */
    ancoreDi(pensieroId) {
      return DB.legami.filter(l => l.da_tipo === 'pensiero' && !this._etichette.includes(l.a_tipo)
        && String(l.da_id) === String(pensieroId))
        .map(l => ({ legame_id: l.id, tipo: l.a_tipo, target: l.a_id }));
    },

    /* ---- etichette: tag e cadenze ----
       Un tag è un legame `pensiero → tag` dove l'id del tag è il tag stesso.
       Niente colonna nuova, niente migration: e soprattutto un tag diventa
       un nodo della rete come gli altri, quindi domani ci si può appendere
       qualunque cosa (una scheda, un'azione) senza cambiare lo schema.

       La **cadenza** funziona esattamente allo stesso modo ma vive in un
       elenco suo (`a_tipo = 'cadenza'`): si scrive uguale, non si mescola.
       Basta passare `quale` per lavorare sull'uno o sull'altro. */
    _etichette: ['tag', 'cadenza'],
    tagsDi(cosaId, tipo, quale) {
      const et = quale || 'tag';
      return DB.legami.filter(l => l.da_tipo === (tipo || 'pensiero') && l.a_tipo === et
        && String(l.da_id) === String(cosaId)).map(l => l.a_id);
    },
    /* tutte le etichette esistenti, dalla più usata alla meno usata */
    tuttiITag(quale) {
      const et = quale || 'tag';
      const conta = new Map();
      DB.legami.filter(l => l.a_tipo === et).forEach(l => conta.set(l.a_id, (conta.get(l.a_id) || 0) + 1));
      return [...conta.entries()].map(([tag, n]) => ({ tag, n }))
        .sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'it'));
    },
    /* rimpiazza le etichette di una cosa con quelle passate: toglie quelle
       sparite, aggiunge le nuove, lascia stare le altre */
    setTags(cosaId, tags, tipo, quale) {
      tipo = tipo || 'pensiero';
      const et = quale || 'tag';
      const puliti = [];
      (tags || []).forEach(t => {
        const v = String(t || '').trim();
        if (v && !puliti.includes(v)) puliti.push(v);
      });
      DB.legami.filter(l => l.da_tipo === tipo && l.a_tipo === et
        && String(l.da_id) === String(cosaId) && !puliti.includes(l.a_id))
        .map(l => l.id).forEach(id => this.scollega(id));
      const ora = this.tagsDi(cosaId, tipo, et);
      puliti.forEach(t => { if (!ora.includes(t)) this.collega(tipo, cosaId, et, t, et); });
      return puliti;
    },
    pensieriDi(tipo, id) {
      const ids = DB.legami.filter(l => l.da_tipo === 'pensiero' && l.a_tipo === tipo && String(l.a_id) === String(id))
        .map(l => String(l.da_id));
      return DB.pensieri.filter(p => ids.includes(String(p.id)));
    },
    /* La descrizione di un Nome sta in `asma.spiegazione`: è contenuto canonico,
       e la policy `asma_scrittura_admin` la lascia scrivere solo a chi ha
       ruolo 'admin' in `profili`. Per gli altri il DB rifiuta: il testo resta
       in cache fino al reload e l'errore finisce in console. */
    setSpiegazioneAsma(numero, testo) {
      const x = DB.asma.find(a => String(a.numero) === String(numero));
      if (!x) return null;
      x.spiegazione = testo || null;
      aggiorna('asma', { spiegazione: x.spiegazione }, { numero: x.numero });
      return x;
    },
    addPensiero(testo, ancore, tags) {
      const p = { id: nuovoId(), user_id: uid(), testo, giorno: this.today(), stato: 'grezzo' };
      DB.pensieri.push(p); salva('pensieri', p);
      (ancore || []).forEach(a => { if (a && a.tipo && a.id) this.collega('pensiero', p.id, a.tipo, a.id, 'nato_da'); });
      if (tags) this.setTags(p.id, tags);
      return p;
    },
    /* Riscrive un pensiero già salvato: il testo e la lista delle ancore.
       Si tocca solo ciò che è cambiato — le ancore rimaste si lasciano stare,
       così non perdono la loro relazione (un `si_riferisce_a` non diventa
       `nato_da` solo perché hai corretto una virgola). */
    editPensiero(id, testo, ancore, tags) {
      const p = DB.pensieri.find(x => String(x.id) === String(id));
      if (!p) return null;
      p.testo = testo;
      aggiorna('pensieri', { testo }, { id: p.id });
      if (tags) this.setTags(p.id, tags);

      const nuove = (ancore || []).filter(a => a && a.tipo && a.id);
      const chiave = a => a.tipo + '|' + a.id;
      const restano = new Set(nuove.map(chiave));
      const vecchie = this.ancoreDi(p.id);
      vecchie.forEach(a => { if (!restano.has(a.tipo + '|' + a.target)) this.scollega(a.legame_id); });
      const gia = new Set(vecchie.map(a => a.tipo + '|' + a.target));
      nuove.forEach(a => { if (!gia.has(chiave(a))) this.collega('pensiero', p.id, a.tipo, a.id, 'nato_da'); });
      return p;
    },
    /* Prima i legami, poi il pensiero: un pensiero cancellato non deve
       lasciare ancore orfane appese nella rete. */
    delPensiero(id) {
      const i = DB.pensieri.findIndex(x => String(x.id) === String(id));
      if (i < 0) return false;
      /* tutti i fili che partono da qui (ancore e tag) e quelli che arrivano */
      DB.legami.filter(l => (l.da_tipo === 'pensiero' && String(l.da_id) === String(id))
        || (l.a_tipo === 'pensiero' && String(l.a_id) === String(id)))
        .map(l => l.id).forEach(lid => this.scollega(lid));
      DB.pensieri.splice(i, 1);
      cancella('pensieri', { id });
      return true;
    },

    /* ---- Corano: indici e posizioni ---- */
    _ayaIndex(sura, aya) { return this.idxDi(+sura || 1, aya || 0); },
    _pct(sura, aya) { return Math.min(100, Math.round(this._ayaIndex(sura, aya) / TOTALE_AYA * 100)); },
    idxDi(suraNum, aya) {
      let n = 0;
      for (let i = 1; i < suraNum; i++) n += VERSI_SURA[i - 1] || 0;
      return n + (aya || 0);
    },
    _ayaDaIndice(n) {
      n = Math.max(1, Math.min(TOTALE_AYA, Math.round(n)));
      let acc = 0;
      for (let s = 1; s <= 114; s++) {
        const c = VERSI_SURA[s - 1];
        if (acc + c >= n) return { sura: s, aya: n - acc };
        acc += c;
      }
      return { sura: 114, aya: 6 };
    },
    juzDi(idx) { let j = 1; JUZ_START.forEach(([s, a], i) => { if (idx >= this.idxDi(s, a)) j = i + 1; }); return j; },
    inizioJuz(idx) { const i = JUZ_START.findIndex(([s, a]) => this.idxDi(s, a) === idx); return i >= 0 ? i + 1 : null; },
    nomeSura(n) { const s = DB.sure.find(x => x.numero === +n); return s ? s.translit : 'Sura ' + n; },
    vvSura: n => VERSI_SURA[n - 1] || 0,
    sureTutte() { return VERSI_SURA.map((vv, i) => ({ numero: i + 1, nome: this.nomeSura(i + 1), vv })); },
    fmtPos(p) { const s = DB.sure.find(x => x.numero === p.sura); return (s ? s.translit + ' ' : 'Sura ') + p.sura + ':' + p.aya; },
    finestra: () => finestra,
    suraInFinestra: () => finestraSura,

    /* allunga la finestra in avanti: il lettore non deve mai finire
       contro un muro. Restituisce quanti versetti ha aggiunto. */
    async caricaAncora(quanti = 60) {
      if (!DB.ayat.length) return 0;
      const ultimo = DB.ayat[DB.ayat.length - 1].id;
      if (ultimo >= TOTALE_AYA) return 0;                /* fine del Corano */
      const da = ultimo + 1, a = Math.min(TOTALE_AYA, ultimo + quanti);
      const { data, error } = await sb.from('ayat').select('*').gte('id', da).lte('id', a).order('id');
      if (error || !data || !data.length) return 0;
      const righe = data.map(x => ({ ...x, sura_id: x.sura, aya: x.numero, arabo: x.testo_ar }));
      const { data: tr } = await sb.from('ayat_traduzioni').select('aya_id,testo')
        .in('aya_id', righe.map(r => r.id)).eq('lang', 'it');
      const mappa = {}; (tr || []).forEach(t => { mappa[t.aya_id] = t.testo; });
      righe.forEach(r => { r.it = mappa[r.id] || ''; r.traduzione = r.it; });
      DB.ayat = DB.ayat.concat(righe);
      finestra.a = a; finestraSura = null;   /* non è più una sura sola */
      return righe.length;
    },
    /* siamo arrivati in fondo al Libro? */
    fineCorano: () => DB.ayat.length > 0 && DB.ayat[DB.ayat.length - 1].id >= TOTALE_AYA,

    /* ricerca su TUTTO il Corano, non solo su quello in memoria.
       Le parole si cercano nella traduzione e nel testo arabo. */
    async cercaAyat({ sura, numero, testo, limite = 80 } = {}) {
      let ids = null;
      if (testo && testo.trim()) {
        const t = testo.trim();
        const [tr, ar] = await Promise.all([
          sb.from('ayat_traduzioni').select('aya_id').eq('lang', 'it').ilike('testo', '%' + t + '%').limit(limite),
          sb.from('ayat').select('id').ilike('testo_ar', '%' + t + '%').limit(limite),
        ]);
        ids = [...new Set([...(tr.data || []).map(x => x.aya_id), ...(ar.data || []).map(x => x.id)])];
        if (!ids.length) return [];
      }
      let q = sb.from('ayat').select('*').order('id').limit(limite);
      if (sura) q = q.eq('sura', +sura);
      if (numero) q = q.eq('numero', +numero);
      if (ids) q = q.in('id', ids);
      const { data, error } = await q;
      if (error || !data) return [];
      const righe = data.map(x => ({ ...x, sura_id: x.sura, aya: x.numero, arabo: x.testo_ar }));
      const { data: tr2 } = await sb.from('ayat_traduzioni').select('aya_id,testo')
        .in('aya_id', righe.map(r => r.id)).eq('lang', 'it');
      const mappa = {}; (tr2 || []).forEach(t => { mappa[t.aya_id] = t.testo; });
      righe.forEach(r => { r.it = mappa[r.id] || ''; r.traduzione = r.it; });
      return righe;
    },

    /* ---- khatam ---- */
    khatamList: () => DB.khatam,
    activeKhatam: () => DB.khatam.find(k => k.stato === 'attivo'),
    khatamDone: () => DB.khatam.filter(k => k.stato === 'completato').length,
    khatamSospesi: () => DB.khatam.filter(k => k.stato === 'sospeso'),
    khatamCompletati: () => DB.khatam.filter(k => k.stato === 'completato')
      .slice().sort((a, b) => String(b.completato_il || '').localeCompare(String(a.completato_il || ''))),
    lettura() {
      const k = this.activeKhatam();
      if (k) {
        const p = this._ayaDaIndice(k.aya_id || 1);
        return { sura_id: p.sura, aya: p.aya, numero: k.numero, attivo: true, khatam: this.khatamDone(), pct: Math.round((k.aya_id || 0) / TOTALE_AYA * 100) };
      }
      return { sura_id: 1, aya: 0, numero: 0, attivo: false, khatam: this.khatamDone(), pct: 0 };
    },
    newKhatam(scadenza) {
      if (this.activeKhatam()) return;
      const numero = Math.max(0, ...DB.khatam.map(k => k.numero)) + 1;
      const k = { id: nuovoId(), user_id: uid(), numero, aya_id: 1, stato: 'attivo', iniziato_il: this.today(), scadenza: scadenza || null, completato_il: null };
      DB.khatam.push(k); salva('khatam', k);
      return k;
    },
    stopKhatam() { const k = this.activeKhatam(); if (k) { k.stato = 'sospeso'; salva('khatam', k); } },
    resumeKhatam(id) {
      if (this.activeKhatam()) return false;
      const k = DB.khatam.find(x => String(x.id) === String(id));
      if (k) { k.stato = 'attivo'; salva('khatam', k); return true; }
      return false;
    },
    deleteKhatam(id) {
      const i = DB.khatam.findIndex(k => String(k.id) === String(id));
      if (i >= 0) { DB.khatam.splice(i, 1); cancella('khatam', { id }); }
    },
    completeKhatam() {
      const k = this.activeKhatam();
      if (k && (k.aya_id || 0) >= TOTALE_AYA) { k.stato = 'completato'; k.completato_il = this.today(); salva('khatam', k); return true; }
      return false;
    },
    setBookmark(sura, aya) {
      const k = this.activeKhatam(); if (!k) return;
      k.aya_id = this.idxDi(+sura, aya); salva('khatam', k);
    },
    pianoKhatam() {
      const k = this.activeKhatam();
      if (!k || !k.scadenza || !k.iniziato_il) return null;
      const GG = 86400000, oggi = this.today();
      const d0 = new Date(k.iniziato_il + 'T12:00:00'), d1 = new Date(k.scadenza + 'T12:00:00'), dn = new Date(oggi + 'T12:00:00');
      const totGiorni = Math.max(1, Math.round((d1 - d0) / GG) + 1);
      const giorno = Math.min(totGiorni, Math.max(1, Math.round((dn - d0) / GG) + 1));
      const alGiorno = TOTALE_AYA / totGiorni;
      const target = Math.min(TOTALE_AYA, Math.round(alGiorno * giorno));
      const inizioOggi = Math.round(alGiorno * (giorno - 1));
      const pos = k.aya_id || 0;
      return {
        totGiorni, giorno, alGiorno: Math.round(alGiorno), target, pos, inizioOggi,
        scarto: pos - inizioOggi,
        daLeggereOggi: Math.max(0, target - pos),
        partireDa: this._ayaDaIndice(Math.max(pos, inizioOggi) + 1),
        fermarsiA: this._ayaDaIndice(target),
        pctPiano: Math.min(100, Math.round(giorno / totGiorni * 100)),
        pctLetto: Math.min(100, Math.round(pos / TOTALE_AYA * 100)),
        scaduto: oggi > k.scadenza,
        giorniRimasti: Math.max(0, totGiorni - giorno),
      };
    },
    durataKhatam(k) {
      if (!k.iniziato_il || !k.completato_il) return null;
      const GG = 86400000;
      const d0 = new Date(k.iniziato_il + 'T12:00:00'), d1 = new Date(k.completato_il + 'T12:00:00');
      const giorni = Math.max(1, Math.round((d1 - d0) / GG) + 1);
      let vsPiano = null;
      if (k.scadenza) vsPiano = Math.round((new Date(k.scadenza + 'T12:00:00') - d1) / GG);
      return { giorni, ritmo: Math.round(TOTALE_AYA / giorni), vsPiano };
    },

    /* ---- memorizzazione ---- */
    studio: () => DB.studio,
    setStudio(patch) { Object.assign(DB.studio, patch); this.setSettings({ vista: { studio: DB.studio } }); },
    memPct: () => Math.round(DB.memorizzato.length / TOTALE_AYA * 100),
    isMem(s, a) { const id = this.idxDi(+s, a); return DB.memorizzato.some(e => e.aya_id === id); },
    toggleMem(s, a) {
      const id = this.idxDi(+s, a), me = uid();
      const i = DB.memorizzato.findIndex(e => e.aya_id === id);
      if (i >= 0) { DB.memorizzato.splice(i, 1); if (me) cancella('memorizzazione', { user_id: me, aya_id: id }); }
      else {
        const r = { user_id: me, aya_id: id, stato: 'nuovo', data: this.today() };
        DB.memorizzato.push(r); if (me) salva('memorizzazione', r, 'user_id,aya_id');
      }
    },
    isHl(s, a) { const id = this.idxDi(+s, a); return DB.evidenziazioni.some(e => e.aya_id === id); },
    toggleHl(s, a) {
      const id = this.idxDi(+s, a), me = uid();
      const i = DB.evidenziazioni.findIndex(e => e.aya_id === id);
      if (i >= 0) { DB.evidenziazioni.splice(i, 1); if (me) cancella('evidenziazioni', { user_id: me, aya_id: id }); }
      else { const r = { user_id: me, aya_id: id, colore: 'ottone' }; DB.evidenziazioni.push(r); if (me) salva('evidenziazioni', r, 'user_id,aya_id'); }
    },
    unitaMem: {
      corano: { l: 'tutto il Corano', v: TOTALE_AYA, fisso: true },
      juz: { l: 'juz', v: Math.round(TOTALE_AYA / 30) },
      hizb: { l: 'ḥizb', v: Math.round(TOTALE_AYA / 60) },
      sura: { l: 'sure scelte', selezione: true },
      versetti: { l: 'versetti', v: 1 },
    },
    ayatObiettivo(tipo, n) {
      const u = this.unitaMem[tipo] || this.unitaMem.corano;
      if (u.fisso) return Math.max(1, TOTALE_AYA - DB.memorizzato.length);
      if (u.selezione) return (Array.isArray(n) ? n : []).reduce((s, num) => s + (VERSI_SURA[num - 1] || 0), 0);
      return Math.max(1, Math.min(TOTALE_AYA, Math.round(u.v * (+n || 1))));
    },
    labelObiettivo(tipo, n) {
      const u = this.unitaMem[tipo] || this.unitaMem.corano;
      const v = this.ayatObiettivo(tipo, n);
      if (u.fisso) return `${u.l} · ${v.toLocaleString('it')} versetti da fare`;
      if (u.selezione) {
        const arr = Array.isArray(n) ? n : [];
        if (!arr.length) return 'nessuna sura scelta';
        const nomi = arr.map(x => this.nomeSura(x));
        return `${nomi.slice(0, 3).join(', ')}${nomi.length > 3 ? ` +${nomi.length - 3}` : ''} · ${v.toLocaleString('it')} versetti`;
      }
      return `${+n || 1} ${u.l} · ≈ ${v.toLocaleString('it')} versetti`;
    },
    pianoMemAttivo: () => DB.piani_mem.find(p => p.stato === 'attivo'),
    pianiMemAttivi: () => DB.piani_mem.filter(p => p.stato === 'attivo'),
    pianiMemSospesi: () => DB.piani_mem.filter(p => p.stato === 'sospeso'),
    pianiMemCompletati: () => DB.piani_mem.filter(p => p.stato === 'completato')
      .slice().sort((a, b) => String(b.completato_il || '').localeCompare(String(a.completato_il || ''))),
    /* più piani in corso insieme: uno sulle sure corte, uno sul juz — convivono */
    newPianoMem(fine, tipo, n) {
      tipo = tipo || 'corano';
      const p = {
        id: nuovoId(), user_id: uid(), inizio: this.today(), fine: fine || null,
        obiettivo_tipo: tipo, obiettivo_n: Array.isArray(n) ? n.slice() : (+n || 1),
        obiettivo: this.ayatObiettivo(tipo, n), base: DB.memorizzato.length,
        stato: 'attivo', completato_il: null,
      };
      DB.piani_mem.push(p); salva('piani_mem', p);
      return p;
    },
    stopPianoMem(id) {
      const p = id ? DB.piani_mem.find(x => String(x.id) === String(id)) : this.pianoMemAttivo();
      if (p && p.stato === 'attivo') { p.stato = 'sospeso'; salva('piani_mem', p); }
    },
    resumePianoMem(id) {
      const p = DB.piani_mem.find(x => String(x.id) === String(id));
      if (p) { p.stato = 'attivo'; salva('piani_mem', p); return true; }
      return false;
    },
    delPianoMem(id) {
      const i = DB.piani_mem.findIndex(x => String(x.id) === String(id));
      if (i >= 0) { DB.piani_mem.splice(i, 1); cancella('piani_mem', { id }); }
    },

    /* Il perimetro e il progresso di un piano. Le aya memorizzate vivono in
       `memorizzazione`, fuori dai piani: sospendere o eliminare un piano non
       ne tocca nemmeno una.
       - sure scelte: contano le aya DENTRO quelle sure, in qualunque momento
         siano state segnate (anche durante una sospensione);
       - tutto il Corano: conta il totale assoluto;
       - juz/hizb/versetti: quantità senza perimetro — conta ciò che si è
         aggiunto da quando il piano è partito (base). */
    _rangesPiano(p) {
      if ((p.obiettivo_tipo || 'corano') !== 'sura' || !Array.isArray(p.obiettivo_n)) return null;
      return p.obiettivo_n.map(s => [this.idxDi(s, 1), this.idxDi(s, VERSI_SURA[s - 1] || 0)]);
    },
    progressoPiano(p) {
      const tipo = p.obiettivo_tipo || 'corano';
      const ranges = this._rangesPiano(p);
      if (ranges) {
        const dentro = m => ranges.some(([a, b]) => m.aya_id >= a && m.aya_id <= b);
        const marks = DB.memorizzato.filter(dentro);
        /* partenza = quanto del perimetro era già memorizzato prima del piano */
        const startVal = marks.filter(m => !m.data || m.data < p.inizio).length;
        return { startVal, meta: p.obiettivo || 1, adesso: marks.length, dentro };
      }
      if (tipo === 'corano') return { startVal: p.base || 0, meta: TOTALE_AYA, adesso: DB.memorizzato.length, dentro: null };
      return { startVal: p.base || 0, meta: (p.base || 0) + (p.obiettivo || 1), adesso: Math.max(p.base || 0, DB.memorizzato.length), dentro: null };
    },
    /* i piani arrivati in fondo si chiudono da soli; torna quelli appena finiti */
    controllaPianiMem() {
      const finiti = [];
      this.pianiMemAttivi().forEach(p => {
        const pr = this.progressoPiano(p);
        if (pr.adesso >= pr.meta) {
          p.stato = 'completato'; p.completato_il = this.today(); salva('piani_mem', p);
          finiti.push(p);
        }
      });
      return finiti;
    },
    durataPianoMem(p) {
      if (!p.inizio || !p.completato_il) return null;
      const GG = 86400000;
      const giorni = Math.max(1, Math.round((new Date(p.completato_il + 'T12:00:00') - new Date(p.inizio + 'T12:00:00')) / GG) + 1);
      let vsPiano = null;
      if (p.fine) vsPiano = Math.round((new Date(p.fine + 'T12:00:00') - new Date(p.completato_il + 'T12:00:00')) / GG);
      return { giorni, ritmo: Math.round((p.obiettivo || 0) / giorni * 10) / 10, vsPiano };
    },
    memDelGiorno(giorno) { return DB.memorizzato.filter(m => m.data === giorno).length; },
    /* Andamento giorno per giorno di UN piano: quanti versetti (del suo
       perimetro) ho segnato ogni giorno, e dove la linea del piano dice che
       dovrei essere. Copre tutto il periodo, futuro compreso (n e cum null). */
    andamentoMem(pid) {
      const p = pid ? DB.piani_mem.find(x => String(x.id) === String(pid)) : this.pianiMemAttivi()[0];
      if (!p || !p.fine) return null;
      const GG = 86400000;
      const gg = g => new Date(g + 'T12:00:00').getTime();
      const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      const oggi = this.today();
      const pr = this.progressoPiano(p);

      const perGiorno = {};
      DB.memorizzato.forEach(m => { if (m.data && (!pr.dentro || pr.dentro(m))) perGiorno[m.data] = (perGiorno[m.data] || 0) + 1; });

      const totGiorni = Math.max(1, Math.round((gg(p.fine) - gg(p.inizio)) / GG) + 1);
      const daFare = Math.max(1, pr.meta - pr.startVal);
      const quota = daFare / totGiorni;

      const giorni = [];
      let cum = pr.startVal;
      for (let i = 0; i < totGiorni; i++) {
        const g = iso(gg(p.inizio) + i * GG);
        const futuro = g > oggi;
        const n = futuro ? null : (perGiorno[g] || 0);
        if (!futuro) cum += n;
        giorni.push({
          data: g, n, futuro, oggi: g === oggi,
          cum: futuro ? null : cum,
          piano: Math.min(pr.meta, pr.startVal + quota * (i + 1)),
        });
      }
      return { giorni, quota, base: pr.startVal, obiettivo: daFare, meta: pr.meta, inizio: p.inizio, fine: p.fine, oggi, totGiorni };
    },
    statMem() {
      const tot = DB.memorizzato.length;
      /* la percentuale del Corano è l'unione di TUTTO lo studiato,
         di qualunque piano sia figlio — e resta anche senza piani */
      const s = { tot, pctCorano: Math.round(tot / TOTALE_AYA * 1000) / 10, oggi: this.memDelGiorno(this.today()), piani: [], piano: null };
      s.piani = this.pianiMemAttivi().map(p => this._statPiano(p)).filter(Boolean);
      s.piano = s.piani[0] || null;
      return s;
    },
    _statPiano(p) {
      if (!p || !p.fine) return null;
      const GG = 86400000;
      const d0 = new Date(p.inizio + 'T12:00:00'), d1 = new Date(p.fine + 'T12:00:00'), dn = new Date(this.today() + 'T12:00:00');
      const totGiorni = Math.max(1, Math.round((d1 - d0) / GG) + 1);
      const giorno = Math.min(totGiorni, Math.max(1, Math.round((dn - d0) / GG) + 1));
      const pr = this.progressoPiano(p);
      const daFare = Math.max(1, pr.meta - pr.startVal);
      const alGiorno = daFare / totGiorni;
      const fatteObiettivo = Math.max(0, pr.adesso - pr.startVal);
      const target = Math.min(pr.meta, Math.round(pr.startVal + alGiorno * giorno));
      const inizioOggi = Math.round(pr.startVal + alGiorno * (giorno - 1));
      const fatteNelPiano = DB.memorizzato.filter(m => m.data && m.data >= p.inizio && (!pr.dentro || pr.dentro(m))).length;
      return {
        id: p.id, inizio: p.inizio, fine: p.fine, base: pr.startVal, stato: p.stato,
        obiettivo: daFare, obiettivoLabel: this.labelObiettivo(p.obiettivo_tipo || 'corano', p.obiettivo_n),
        obiettivo_tipo: p.obiettivo_tipo || 'corano', obiettivo_n: p.obiettivo_n,
        fatteObiettivo,
        totGiorni, giorno, giorniRimasti: Math.max(0, totGiorni - giorno),
        alGiorno: Math.ceil(alGiorno), target, inizioOggi,
        restanoOggi: Math.max(0, target - pr.adesso),
        scarto: pr.adesso - inizioOggi,
        ritmoReale: Math.round(fatteNelPiano / giorno * 10) / 10,
        fatteNelPiano,
        pctObiettivo: Math.round(fatteObiettivo / daFare * 100),
        pctTempo: Math.round(giorno / totGiorni * 100),
        scaduto: this.today() > p.fine,
        stimaFine: fatteNelPiano > 0
          ? new Date(dn.getTime() + Math.ceil(Math.max(0, daFare - fatteObiettivo) / (fatteNelPiano / giorno)) * GG).toISOString().slice(0, 10)
          : null,
      };
    },

    /* ---- audio della recitazione (Ḥuṣarī): l'id dell'aya È il nome del file ---- */
    qariAudio() { const a = DB.impostazioni.audio || {}; return a.qari || 'ar.husary'; },
    audioUrlAya(id) { return `https://cdn.islamic.network/quran/audio/128/${this.qariAudio()}/${+id}.mp3`; },
    audioUrlAyaRiserva(id) {
      /* everyayah distribuisce la stessa registrazione di Ḥuṣarī, indirizzata per sura+aya */
      const p = this._ayaDaIndice(+id);
      const pad = (n, w) => String(n).padStart(w, '0');
      return `https://everyayah.com/data/Husary_128kbps/${pad(p.sura, 3)}${pad(p.aya, 3)}.mp3`;
    },

    /* manutenzione */
    export() { return JSON.stringify(DB, null, 2); },
    reset() { location.reload(); },
  };

  /* toglie dalla riga i campi che il database non ha */
  function perDB(a) {
    const r = { ...a };
    if (r.ora === '') r.ora = null;
    if (r.fine === '') r.fine = null;
    if (r.preghiera === '') r.preghiera = null;
    delete r.it;
    return r;
  }
})();
