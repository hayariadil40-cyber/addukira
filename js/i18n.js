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
    'nav.ascolto':         'Ascolto',
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
    'nav.group.family':    'Famiglia',
    'nav.cassa':           'Cassa zio',
    /* pagina Cassa di famiglia */
    'cassa.eye':           'Cassa di famiglia',
    'cassa.title':         'Conto spese zio 3rbi',
    'cassa.sub':           'Ogni dirham donato e ogni spesa fatta, scritti qui per tutti.',
    'cassa.in':            'Donazioni',
    'cassa.out':           'Spese',
    'cassa.saldo':         'Saldo in cassa',
    'cassa.add':           'Aggiungi un movimento…',
    'cassa.f_all':         'Tutti',
    'cassa.f_donazione':   'Entrate',
    'cassa.f_spesa':       'Spese',
    'cassa.nomi':          'mostra i nomi dei donatori',
    'cassa.donazione':     'Donazione',
    'cassa.spesa':         'Spesa',
    'cassa.donatore':      'Donatore n.',
    'cassa.vuoto':         'Nessun movimento.',
    'cassa.nospese':       'Ancora nessuna spesa.',
    'cassa.dove':          'Dove vanno i soldi',
    'cassa.donatori':      'Donatori',
    'cassa.don_add':       'Aggiungi',
    'cassa.don_n':         'N.',
    'cassa.don_nome':      'Nome',
    'cassa.loading':       'Caricamento…',
    'cassa.cur':           'DH',
    'cassa.m_new':         'Nuovo movimento',
    'cassa.m_edit':        'Modifica movimento',
    'cassa.m_s':           'Importo sempre positivo: il tipo dice se entra o esce.',
    'cassa.l_tipo':        'Tipo',
    'cassa.l_data':        'Data',
    'cassa.l_importo':     'Importo (DH)',
    'cassa.l_don':         'N. donatore',
    'cassa.l_cat':         'Categoria',
    'cassa.l_desc':        'Descrizione',
    'cassa.l_desc_dr':     'Descrizione in darija',
    'cassa.l_desc_ar':     'Descrizione in arabo',
    'cassa.facolt':        'facoltativa',
    'cassa.salva':         'Salva',
    'cassa.annulla':       'Annulla',
    'cassa.err_importo':   'Scrivi un importo maggiore di zero',
    'cassa.err_data':      'Scegli una data',
    'cassa.conferma_del':  'Eliminare questo movimento?',
    'cassa.salvato':       'Salvato',
    'cassa.eliminato':     'Eliminato',
    'cassa.errore':        'Non riesco a salvare: ',
  },
  ar: {
    'nav.group.life':      'حياتي',
    'nav.oggi':            'اليوم',
    'nav.lettura':         'القراءة',
    'nav.memorizzazione':  'الحفظ',
    'nav.ascolto':         'الاستماع',
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
    'nav.group.family':    'العائلة',
    'nav.cassa':           'صندوق العم',
    /* pagina Cassa di famiglia */
    'cassa.eye':           'صندوق العائلة',
    'cassa.title':         'حساب نفقات عمّي العربي',
    'cassa.sub':           'كلّ درهمٍ يُتبرَّع به وكلّ نفقةٍ تُصرَف، مدوَّنةٌ هنا ليطّلع عليها الجميع.',
    'cassa.in':            'التبرّعات',
    'cassa.out':           'النفقات',
    'cassa.saldo':         'الرصيد في الصندوق',
    'cassa.add':           'أضف عملية…',
    'cassa.f_all':         'الكل',
    'cassa.f_donazione':   'التبرّعات',
    'cassa.f_spesa':       'النفقات',
    'cassa.nomi':          'أظهر أسماء المتبرّعين',
    'cassa.donazione':     'تبرّع',
    'cassa.spesa':         'نفقة',
    'cassa.donatore':      'متبرّع رقم',
    'cassa.vuoto':         'لا توجد عمليات.',
    'cassa.nospese':       'لا توجد نفقات بعد.',
    'cassa.dove':          'أين تذهب الأموال',
    'cassa.donatori':      'المتبرّعون',
    'cassa.don_add':       'أضف',
    'cassa.don_n':         'رقم',
    'cassa.don_nome':      'الاسم',
    'cassa.loading':       'جارٍ التحميل…',
    'cassa.cur':           'درهم',
    'cassa.m_new':         'عملية جديدة',
    'cassa.m_edit':        'تعديل العملية',
    'cassa.m_s':           'المبلغ دائمًا موجب: النوع يحدّد إن كان يدخل أو يخرج.',
    'cassa.l_tipo':        'النوع',
    'cassa.l_data':        'التاريخ',
    'cassa.l_importo':     'المبلغ (درهم)',
    'cassa.l_don':         'رقم المتبرّع',
    'cassa.l_cat':         'البند',
    'cassa.l_desc':        'الوصف',
    'cassa.l_desc_dr':     'الوصف بالدارجة',
    'cassa.l_desc_ar':     'الوصف بالعربية',
    'cassa.facolt':        'اختياري',
    'cassa.salva':         'حفظ',
    'cassa.annulla':       'إلغاء',
    'cassa.err_importo':   'اكتب مبلغًا أكبر من صفر',
    'cassa.err_data':      'اختر تاريخًا',
    'cassa.conferma_del':  'هل تريد حذف هذه العملية؟',
    'cassa.salvato':       'تمّ الحفظ',
    'cassa.eliminato':     'تمّ الحذف',
    'cassa.errore':        'تعذّر الحفظ: ',
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
