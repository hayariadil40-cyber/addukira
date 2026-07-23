/* ============================================================
   STORE — strato dati di Al-Maktaba.
   v1: cache in memoria + persistenza localStorage.
   Passo 2 (Supabase): stesse funzioni pubbliche; init() caricherà
   da Supabase e _persist() scriverà lì. app.js NON cambia.
   ============================================================ */

const MOMENTI = [
  { k: 'risveglio',     t: 'Risveglio',        ico: '🌅' },
  { k: 'dopo_salat',    t: 'Dopo la ṣalāt',    ico: '🕌' },
  { k: 'lettura',       t: 'Lettura',          ico: '📖' },
  { k: 'sera',          t: 'Sera',             ico: '🌆' },
  { k: 'prima_dormire', t: 'Prima di dormire', ico: '🌙' },
];

/* numero di versetti per ognuna delle 114 sure (indice 0 = sura 1).
   Serve a calcolare la % di avanzamento dal segnalibro. Totale = 6236. */
const VERSI_SURA = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const TOTALE_AYA = 6236;

/* ---- dati seme: presenti solo al primo avvio ---- */
const SEED = {
  sure: [
    { id: 1, numero: 2,   nome_arabo: 'البقرة',  translit: 'Al-Baqara', titolo_it: 'La giovenca', n_versetti: 286, rivelazione: 'medinese' },
    { id: 2, numero: 7,   nome_arabo: 'الأعراف', translit: 'Al-Aʿrāf',  titolo_it: 'Il limbo',    n_versetti: 206, rivelazione: 'meccana' },
    { id: 3, numero: 12,  nome_arabo: 'يوسف',    translit: 'Yūsuf',     titolo_it: 'Giuseppe',    n_versetti: 111, rivelazione: 'meccana' },
    { id: 4, numero: 114, nome_arabo: 'الناس',   translit: 'An-Nās',    titolo_it: 'Gli uomini',  n_versetti: 6,   rivelazione: 'meccana' },
  ],
  versetti: [
    { id: 1, sura_id: 1, numero: 255, arabo: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', traduzione: "Allah! Non c'è divinità se non Lui, il Vivente, l'Assoluto…", contesto: 'Āyat al-Kursī.', nota: '' },
    { id: 2, sura_id: 2, numero: 180, arabo: 'وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا', traduzione: 'Ad Allah appartengono i nomi più belli: invocateLo con essi.', contesto: 'Fondamento dello studio dei 99 nomi.', nota: '' },
    { id: 3, sura_id: 3, numero: 21, arabo: 'وَاللَّهُ غَالِبٌ عَلَىٰ أَمْرِهِ وَلَٰكِنَّ أَكْثَرَ النَّاسِ لَا يَعْلَمُونَ', traduzione: 'Allah prevale nel Suo disegno, ma la maggior parte degli uomini non lo sa.', contesto: '', nota: '' },
  ],
  personaggi: [
    { id: 1, nome: 'Yusuf', nome_arabo: 'يوسف', categoria: 'profeta', biografia: 'La storia più bella: sogno, tradimento, prigione, perdono.', fonte: 'Ibn Kathir' },
    { id: 2, nome: 'ʿUmar ibn al-Khaṭṭāb', nome_arabo: 'عمر بن الخطاب', categoria: 'sahaba', biografia: 'Secondo califfo.', fonte: '' },
  ],
  hadith: [
    { id: 1, testo: 'Chi recita Āyat al-Kursī dopo ogni preghiera prescritta, nulla lo separa dal Paradiso se non la morte.', raccolta: "Nasa'i", numero_rif: "Nasa'i · al-Kubra", grado: 'sahih', narratore_id: null, isnad: '', nota: 'Fondamento della recita dopo-ṣalāt.' },
    { id: 2, testo: 'Ad Allah appartengono novantanove nomi, cento meno uno: chi li custodisce entra in Paradiso.', raccolta: 'Bukhari', numero_rif: 'Bukhari 2736', grado: 'sahih', narratore_id: null, isnad: 'Da Abu Hurayra', nota: '' },
    { id: 3, testo: 'Tasbīḥ, taḥmīd e takbīr trentatré volte dopo ogni preghiera.', raccolta: 'Muslim', numero_rif: 'Muslim 596', grado: 'sahih', narratore_id: null, isnad: '', nota: 'Il 33×3.' },
    { id: 4, testo: 'Lode ad Allah che ci ha dato da mangiare e da bere, ci ha provveduto e dato rifugio…', raccolta: 'Muslim', numero_rif: 'Muslim 2715', grado: 'sahih', narratore_id: null, isnad: '', nota: 'Dhikr prima di dormire.' },
  ],
  storie: [
    { id: 1, titolo: 'Yusuf e i fratelli', sura_id: 3, riassunto: 'Sogno · tradimento · prigione · perdono.', insegnamenti: 'La pazienza nel destino.' },
  ],
  temi: [
    { id: 1, nome: 'Ṣabr · Pazienza', nome_arabo: 'الصبر', descrizione: 'Costanza nei comandamenti.' },
    { id: 2, nome: 'Asmāʾ Allāh · I nomi', nome_arabo: 'أسماء الله', descrizione: 'I 99 nomi, 10-14 a settimana.' },
  ],
  fiqh: [
    { id: 1, titolo: 'Le 4 scuole · Madhab', categoria: 'madhab', contenuto: 'Hanafi, Maliki, Shafiʿi, Hanbali.', fonti: '' },
    { id: 2, titolo: 'La ṣalāt: condizioni e orari', categoria: 'salat', contenuto: 'Regole di validità della preghiera.', fonti: 'Bukhari · Muslim' },
  ],
  pensieri: [
    { id: 1, testo: '"Allah prevale nel Suo disegno" — anche venduto per poche dracme, il piano di Yusuf sta andando dove deve. La sconfitta apparente è il trasporto.', anchor_tipo: 'versetto', anchor_id: 3, data: 'esempio' },
  ],
  adhkar: [
    { id: 1, nome: 'Lode del risveglio', arabo: 'اَلْحَمْدُ لِلَّهِ الَّذي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', traduzione: 'Lode ad Allah che ci ha ridato la vita dopo la morte…', momento: 'risveglio', rip: '', versetto_id: null, hadith_id: null },
    { id: 2, nome: 'Miswak', arabo: '', traduzione: '', momento: 'risveglio', rip: '', versetto_id: null, hadith_id: null },
    { id: 3, nome: 'Nomi di Allah — blocco settimana', arabo: '', traduzione: 'Ar-Raḥmān, Ar-Raḥīm, Al-Malik, Al-Quddūs…', momento: 'risveglio', rip: '1–14', versetto_id: 2, hadith_id: 2 },
    { id: 4, nome: 'Tasbīḥ', arabo: '', traduzione: 'Subḥānallāh · Alḥamdulillāh · Allāhu akbar', momento: 'dopo_salat', rip: '33×3', versetto_id: null, hadith_id: 3 },
    { id: 5, nome: 'Āyat al-Kursī', arabo: '', traduzione: '', momento: 'dopo_salat', rip: '', versetto_id: 1, hadith_id: 1 },
    { id: 6, nome: 'Lode della sera · salute', arabo: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي…', traduzione: "O Allah, concedimi la salute nel corpo, nell'udito, nella vista.", momento: 'sera', rip: '', versetto_id: null, hadith_id: null },
    { id: 7, nome: 'Dua del sonno', arabo: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', traduzione: 'Nel Tuo nome, o Allah, muoio e vivo.', momento: 'prima_dormire', rip: '', versetto_id: null, hadith_id: 4 },
  ],
  spunte: {},                                        /* { '2026-07-20': [1,2] } */
  khatam: [                                          /* letture complete del Corano; uno solo 'attivo' */
    { id: 1, numero: 1, sura_id: 1, aya: 0,  stato: 'completato' },
    { id: 2, numero: 2, sura_id: 1, aya: 0,  stato: 'completato' },
    { id: 3, numero: 3, sura_id: 3, aya: 21, stato: 'attivo' },
  ],
  evidenziazioni: [{ sura_id: 3, aya: 21 }],
  studio: { piano: 'annuale', hizb: 1, ottava: 1 },  /* memorizzazione: piano + selezione corrente */
  memorizzato: [],                                   /* [{ sura_id, aya }] versetti memorizzati */
  ayat_demo: [ /* pagina corrente del lettore — poi: dataset Corano completo */
    { sura_id: 3, aya: 20, arabo: 'وَشَرَوْهُ بِثَمَنٍ بَخْسٍ دَرَاهِمَ مَعْدُودَةٍ وَكَانُوا فِيهِ مِنَ الزَّاهِدِينَ', it: 'Lo vendettero per un prezzo vile, poche dracme contate: davano poco valore a lui.' },
    { sura_id: 3, aya: 21, arabo: 'وَقَالَ الَّذِي اشْتَرَاهُ مِن مِّصْرَ لِامْرَأَتِهِ أَكْرِمِي مَثْوَاهُ … وَاللَّهُ غَالِبٌ عَلَىٰ أَمْرِهِ وَلَٰكِنَّ أَكْثَرَ النَّاسِ لَا يَعْلَمُونَ', it: 'Colui che in Egitto lo comprò disse alla moglie: «Trattalo bene»… Allah prevale nel Suo disegno, ma la maggior parte degli uomini non lo sa.' },
    { sura_id: 3, aya: 22, arabo: 'وَلَمَّا بَلَغَ أَشُدَّهُ آتَيْنَاهُ حُكْمًا وَعِلْمًا ۚ وَكَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ', it: 'Quando giunse alla maturità, gli demmo saggezza e scienza: così ricompensiamo chi fa il bene.' },
    /* ultima sura del Corano — serve per raggiungere il 100% e provare il completamento */
    { sura_id: 4, aya: 1, arabo: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', it: 'Di\': mi rifugio nel Signore degli uomini,' },
    { sura_id: 4, aya: 2, arabo: 'مَلِكِ النَّاسِ', it: 'Re degli uomini,' },
    { sura_id: 4, aya: 3, arabo: 'إِلَٰهِ النَّاسِ', it: 'Dio degli uomini,' },
    { sura_id: 4, aya: 4, arabo: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', it: 'contro il male del sussurratore furtivo,' },
    { sura_id: 4, aya: 5, arabo: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', it: 'che soffia il male nei petti degli uomini,' },
    { sura_id: 4, aya: 6, arabo: 'مِنَ الْجِنَّةِ وَالنَّاسِ', it: 'che sia dei jinn o degli uomini.' },
  ],
};

const LS_KEY = 'al-maktaba-v2';

const store = (() => {
  let DB;
  let seq = 1000;

  /* ---- caricamento: localStorage se esiste, altrimenti seme ---- */
  function init() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      DB = raw ? JSON.parse(raw) : structuredClone(SEED);
    } catch (e) {
      console.warn('Storage non disponibile, uso dati in memoria', e);
      DB = structuredClone(SEED);
    }
    /* migrazione: vecchio segnalibro singolo 'lettura' -> array 'khatam' */
    if (!Array.isArray(DB.khatam)) {
      const old = DB.lettura;
      DB.khatam = (old && old.sura_id)
        ? [{ id: 1, numero: old.khatam || 1, sura_id: old.sura_id, aya: old.aya || 0, stato: 'attivo' }]
        : structuredClone(SEED.khatam);
    }
    delete DB.lettura;
    /* backfill di chiavi nuove eventualmente mancanti */
    for (const k in SEED) if (DB[k] === undefined) DB[k] = structuredClone(SEED[k]);

    seq = Math.max(1000, ...Object.values(DB)
      .filter(Array.isArray).flat()
      .map(r => (r && r.id) || 0));
  }

  function _persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
    catch (e) { console.warn('Persistenza fallita', e); }
    /* Passo 2: qui la scrittura verso Supabase */
  }

  /* ---- API pubblica (identica con Supabase) ---- */
  return {
    init,
    momenti: MOMENTI,

    list:  t => DB[t],
    get:   (t, id) => DB[t].find(x => x.id === id),
    add:   (t, row) => { row.id = ++seq; DB[t].push(row); _persist(); return row; },

    /* spunte del giorno */
    today: () => new Date().toISOString().slice(0, 10),
    isDone(id) { return (DB.spunte[this.today()] || []).includes(id); },
    toggle(id) {
      const d = this.today();
      DB.spunte[d] = DB.spunte[d] || [];
      const i = DB.spunte[d].indexOf(id);
      i >= 0 ? DB.spunte[d].splice(i, 1) : DB.spunte[d].push(id);
      _persist();
    },

    /* ---- khatam & lettura ---- */
    _ayaIndex(sura_id, aya) {
      const s = DB.sure.find(x => x.id === sura_id);
      if (!s) return aya || 0;
      let n = 0;
      for (let i = 1; i < s.numero; i++) n += VERSI_SURA[i - 1] || 0;
      return n + (aya || 0);
    },
    _pct(sura_id, aya) { return Math.min(100, Math.round(this._ayaIndex(sura_id, aya) / TOTALE_AYA * 100)); },

    khatamList: () => DB.khatam,
    activeKhatam: () => DB.khatam.find(k => k.stato === 'attivo'),
    khatamDone: () => DB.khatam.filter(k => k.stato === 'completato').length,

    /* vista compatibile per Oggi/Lettura */
    lettura() {
      const k = this.activeKhatam();
      if (k) return { sura_id: k.sura_id, aya: k.aya, numero: k.numero, attivo: true, khatam: this.khatamDone(), pct: this._pct(k.sura_id, k.aya) };
      return { sura_id: (DB.sure[0] || {}).id || 1, aya: 0, numero: 0, attivo: false, khatam: this.khatamDone(), pct: 0 };
    },
    newKhatam() {
      if (this.activeKhatam()) return;                 /* uno solo alla volta */
      const numero = Math.max(0, ...DB.khatam.map(k => k.numero)) + 1;
      const k = { id: ++seq, numero, sura_id: (DB.sure[0] || {}).id || 1, aya: 0, stato: 'attivo' };
      DB.khatam.push(k); _persist(); return k;
    },
    stopKhatam() { const k = this.activeKhatam(); if (k) { k.stato = 'fermato'; _persist(); } },
    deleteKhatam(id) { const i = DB.khatam.findIndex(k => k.id === id); if (i >= 0) { DB.khatam.splice(i, 1); _persist(); } },
    /* completa il khatam attivo — solo se il segnalibro è all'ultimo versetto (100%) */
    completeKhatam() {
      const k = this.activeKhatam();
      if (k && this._pct(k.sura_id, k.aya) >= 100) { k.stato = 'completato'; _persist(); return true; }
      return false;
    },

    /* segnalibro = posizione del khatam attivo (uno solo) */
    setBookmark(sura_id, aya) {
      const k = this.activeKhatam(); if (!k) return;
      k.sura_id = sura_id; k.aya = aya;
      _persist();
    },
    /* ---- memorizzazione ---- */
    studio: () => DB.studio,
    setStudio(patch) { Object.assign(DB.studio, patch); _persist(); },
    memPct: () => Math.round(DB.memorizzato.length / TOTALE_AYA * 100),
    isMem: (s, a) => DB.memorizzato.some(e => e.sura_id === s && e.aya === a),
    toggleMem(s, a) {
      const i = DB.memorizzato.findIndex(e => e.sura_id === s && e.aya === a);
      i >= 0 ? DB.memorizzato.splice(i, 1) : DB.memorizzato.push({ sura_id: s, aya: a });
      _persist();
    },

    isHl:  (s, a) => DB.evidenziazioni.some(e => e.sura_id === s && e.aya === a),
    toggleHl(s, a) {
      const i = DB.evidenziazioni.findIndex(e => e.sura_id === s && e.aya === a);
      i >= 0 ? DB.evidenziazioni.splice(i, 1) : DB.evidenziazioni.push({ sura_id: s, aya: a });
      _persist();
    },

    /* manutenzione */
    reset() { localStorage.removeItem(LS_KEY); location.reload(); },
    export() { return JSON.stringify(DB, null, 2); },   /* uscita di sicurezza */
  };
})();

store.init();
