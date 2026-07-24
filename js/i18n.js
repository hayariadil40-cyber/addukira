/* ============================================================
   I18N — fondamenta bilingue IT / AR (RTL).
   La moglie dell'utente legge SOLO arabo: l'interfaccia deve
   funzionare in arabo completo, non è un extra.
   Passo 1 (questo): meccanismo + sidebar. Le pagine si traducono
   una alla volta man mano che le rivediamo (passo 2 del piano).
   ============================================================ */

const I18N = {
  it: {
    'nav.group.life':      'La mia vita',
    'nav.oggi':            'Oggi',
    'nav.lettura':         'Lettura',
    'nav.memorizzazione':  'Memorizzazione',
    'nav.pensieri':        'Pensieri',
    'nav.group.study':     'Lo studio',
    'nav.allah':           'Allah',
    'nav.quran':           'Corano',
    'nav.hadith':          'Hadith',
    'nav.people':          'Personaggi',
    'nav.stories':         'Storie',
    'nav.themes':          'Temi',
    'nav.fiqh':            'Fiqh',
    'nav.azioni':          'Azioni',
    'nav.segni_ora':       "Segni dell'Ora",
    'nav.creazione':       'La creazione',
    'nav.luoghi':          'Luoghi',
    'nav.impostazioni':    'Impostazioni',
  },
  ar: {
    'nav.group.life':      'حياتي',
    'nav.oggi':            'اليوم',
    'nav.lettura':         'القراءة',
    'nav.memorizzazione':  'الحفظ',
    'nav.pensieri':        'الخواطر',
    'nav.group.study':     'الدراسة',
    'nav.allah':           'الله',
    'nav.quran':           'القرآن',
    'nav.hadith':          'الحديث',
    'nav.people':          'الأعلام',
    'nav.stories':         'القصص',
    'nav.themes':          'المواضيع',
    'nav.fiqh':            'الفقه',
    'nav.azioni':          'الأعمال',
    'nav.segni_ora':       'علامات الساعة',
    'nav.creazione':       'الخلق',
    'nav.luoghi':          'الأماكن',
    'nav.impostazioni':    'الإعدادات',
  },
};

/* traduzione di una chiave nella lingua attiva (fallback: italiano, poi la chiave) */
function t(key) {
  const l = store.getLang();
  return (I18N[l] && I18N[l][key]) || I18N.it[key] || key;
}

/* applica la lingua al DOM:
   - lang + dir su <html> (ar => rtl)
   - testo di ogni [data-i18n], placeholder di ogni [data-i18n-ph]
   - stato attivo dei bottoni toggle [data-lang-btn] */
function applyI18n() {
  const l = store.getLang();
  document.documentElement.lang = l;
  document.documentElement.dir = (l === 'ar') ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  document.querySelectorAll('[data-lang-btn]').forEach(b => {
    b.classList.toggle('on', b.getAttribute('data-lang-btn') === l);
  });
}
