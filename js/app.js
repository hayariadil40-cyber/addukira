/* ============================================================
   APP — rendering e interazione. Parla solo con `store`.
   ============================================================ */

/* ---- helpers ---- */
const $ = s => document.querySelector(s);
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GRADO = { sahih: '🟢 Ṣaḥīḥ', hasan: 'Ḥasan', daif: 'Ḍaʿīf', qudsi: 'Qudsī', non_verificato: 'da verificare' };
/* etichetta singola (badge card / dettaglio / form) */
const CAT = {
  muhammad: 'Il Profeta Muḥammad ﷺ',
  profeta:  'Profeta',
  sahaba:   'Ṣaḥāba',
  madre_credenti: 'Madre dei credenti',
  nemico:   'Nemico',
  angelo:   'Angelo',
  jinn:     'Jinn',
  sapiente: 'Sapiente',
  altro:    'Altro',
};
/* sezioni della pagina Personaggi (Muḥammad ﷺ è a parte, in cima) */
const PERS_SEZIONI = [
  { k: 'profeta',  t: 'I Profeti',  ico: '🕊️' },
  { k: 'sahaba',         t: 'I Ṣaḥāba',           ico: '🤝' },
  { k: 'madre_credenti', t: 'Le Madri dei credenti', ico: '🌸' },
  { k: 'nemico',         t: 'I Nemici',           ico: '⚔️' },
  { k: 'angelo',   t: 'Gli Angeli', ico: '👼' },
  { k: 'jinn',     t: 'I Jinn',     ico: '🔥' },
  { k: 'sapiente', t: 'I Sapienti', ico: '📚' },
];
const suraOf = id => store.get('sure', id);
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2100); }

/* ---- navigazione ---- */
const PAGES = ['oggi', 'lettura', 'memorizzazione', 'ascolto', 'pensieri', 'allah', 'quran', 'hadith', 'people', 'stories', 'themes', 'fiqh', 'azioni', 'segni_ora', 'creazione', 'luoghi', 'impostazioni', 'search', 'detail'];
let paginaAttiva = 'oggi';
function show(p) {
  PAGES.forEach(x => $('#p-' + x).classList.remove('on')); $('#p-' + p).classList.add('on'); window.scrollTo(0, 0);
  paginaAttiva = p;
  /* la barra del lettore vive solo in Lettura: altrove il play si ferma
     e il toast torna al suo posto in basso */
  document.body.classList.toggle('con-lettore', p === 'lettura');
  if (p !== 'lettura') lettorePausa();
  if (p !== 'memorizzazione') recNavPausa();
  /* il Player invece NON si ferma: è un lettore musicale.
     Fuori dalla sua pagina resta la mini-barra. */
  plMini();
}
function nav(p) {
  if (p !== 'detail' && p !== 'search') backTo = p;   /* il dettaglio torna da dove sei venuto */
  document.querySelectorAll('.lnk').forEach(l => l.classList.toggle('on', l.dataset.p === p));
  renderPage(p); show(p); $('#rail').classList.remove('open');
}
document.querySelectorAll('.lnk').forEach(l => l.onclick = () => nav(l.dataset.p));
$('#mb').onclick = () => $('#rail').classList.toggle('open');

function counts() {
  $('#c-pens').textContent = store.list('pensieri').length;
  $('#c-allah').textContent = store.list('asma').length;
  $('#c-quran').textContent = store.list('sure').length;
  $('#c-hadith').textContent = store.list('hadith').length;
  $('#c-people').textContent = store.list('personaggi').length;
  $('#c-stories').textContent = store.list('storie').length;
  $('#c-themes').textContent = store.list('temi').length;
  $('#c-fiqh').textContent = store.list('fiqh').length;
  $('#c-azioni').textContent = store.list('azioni').length;
  $('#c-segni_ora').textContent = store.list('segni_ora').length;
  $('#c-creazione').textContent = store.list('creazione').length;
  $('#c-luoghi').textContent = store.list('luoghi').length;
}
function head(e, t, s) { return `<div class="eye">${e}</div><h1 class="t">${t}</h1><p class="sub">${s}</p>`; }

/* ============================================================
   OGGI
   ============================================================ */
function pillLinks(a) {
  let out = '';
  if (a.versetto_id) {
    const v = store.get('versetti', a.versetto_id); const s = v ? suraOf(v.sura_id) : null;
    if (v) out += `<span class="pill q" onclick="event.stopPropagation();openDetail('versetto','${v.id}')">${s ? s.numero : ''}:${v.numero} — ${esc(v.traduzione.slice(0, 42))}…</span>`;
  }
  if (a.hadith_id) {
    const h = store.get('hadith', a.hadith_id);
    if (h) out += `<span class="pill h" onclick="event.stopPropagation();openDetail('hadith','${h.id}')">${esc(h.numero_rif)}</span>`;
  }
  return out ? `<div class="why">${out}</div>` : '';
}

/* i 12 mesi hijri traslitterati: in modo italiano si scrivono così, non in arabo */
const MESI_HIJRI = ['Muḥarram', 'Ṣafar', 'Rabīʿ al-awwal', 'Rabīʿ al-thānī',
  'Jumādā al-ūlā', 'Jumādā al-ākhira', 'Rajab', 'Shaʿbān',
  'Ramaḍān', 'Shawwāl', 'Dhū al-qaʿda', 'Dhū al-ḥijja'];

/* data hijri: traslitterata in modo IT, in arabo quando l'interfaccia è AR */
function hijriToday(d, offset) {
  const dd = new Date(d.getTime() + (offset || 0) * 86400000);
  if (store.getLang() === 'ar') {
    try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(dd); }
    catch (e) {
      try { return new Intl.DateTimeFormat('ar-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(dd); }
      catch (_) { return 'التقويم الهجري'; }
    }
  }
  /* cifre latine + nome del mese traslitterato */
  for (const cal of ['en-u-ca-islamic-umalqura', 'en-u-ca-islamic']) {
    try {
      const p = new Intl.DateTimeFormat(cal, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(dd);
      const g = t => (p.find(x => x.type === t) || {}).value;
      const m = +g('month');
      if (m >= 1 && m <= 12) return `${+g('day')} ${MESI_HIJRI[m - 1]} ${+g('year')} H`;
    } catch (e) { /* calendario non supportato, provo il prossimo */ }
  }
  return '';
}

/* intestazione condivisa: data ita, data hijri sotto, titolo opzionale */
function dayHeader(title) {
  const S = store.getSettings(), d = new Date();
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const hjTxt = S.tempo.hijri_mostra ? hijriToday(d, S.tempo.hijri_offset) : '';
  const hj = hjTxt ? `<div class="hijri ${store.getLang() === 'ar' ? '' : 'hijri-lat'}">${hjTxt}</div>` : '';
  const h1 = title ? `<h1 class="t">${title}</h1>` : '';
  return `<div class="day-head"><div><div class="eye">${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}</div>${hj}${h1}</div></div>`;
}

function renderOggi() {
  /* data + hijri */
  $('#oggi-head').innerHTML = dayHeader('');

  /* widget sole · marea · luna — montati una sola volta, poi ridisegnati */
  const w = $('#oggi-widgets');
  const vw = store.getSettings().vista.widget;
  if (w) {
    if (!w.innerHTML.trim()) { w.innerHTML = Widgets.markup(); Widgets.mount(); }
    else Widgets.refresh();
    const sky = $('#w-sky'), tc = $('#w-tide-card'), mc = $('#w-moon-card');
    if (sky) sky.style.display = vw.arco ? '' : 'none';
    if (tc) tc.style.display = vw.marea ? '' : 'none';
    if (mc) mc.style.display = vw.luna ? '' : 'none';
    w.style.display = (vw.arco || vw.marea || vw.luna) ? '' : 'none';
  }

  /* La mia giornata, su due colonne:
     a sinistra le fasce, che scorrono con la giornata — quello che non fai
     nella sua fascia è perso; a destra ciò che vale tutto il giorno e resta
     lì fino al Maghrib. */
  const momAttivi = store.getSettings().vista.momenti;
  const fasce = store.momenti.filter(m => !m.sempre && momAttivi[m.k] !== false);
  const sempre = store.momenti.find(m => m.sempre);

  const sx = fasce.map(m => bloccoMomento(m)).join('');
  /* a destra, sempre sott'occhio: ciò che vale tutto il giorno, e i due fili
     che non finiscono mai — la lettura e la memorizzazione, con il punto in
     cui sei e un tocco per riprendere */
  let dx = (sempre && momAttivi[sempre.k] !== false) ? bloccoMomento(sempre) : '';
  dx += bloccoLettura() + bloccoMemoria();

  $('#oggi-giornata').innerHTML = `<div class="hd">La mia giornata</div>
    <div class="giornata">
      <div class="col-fasce">${sx}</div>
      <div class="col-sempre">${dx || ''}</div>
    </div>`;
}

/* un blocco-fascia con dentro le sue attività */
function bloccoMomento(m) {
  const items = store.attivitaOggi().filter(a => a.momento === m.k);
  const stato = store.fasciaStato(m);
  const orario = store.fasciaOrario(m);
  if (!items.length && stato !== 'ora') return '';       /* fasce vuote: non ingombrano */

  const stati = items.map(a => store.statoEff(a));
  const done = stati.filter(s => s === 'fatto').length;
  const persi = stati.filter(s => s === 'auto').length;
  const cont = items.length
    ? `${done} di ${items.length}` + (persi ? ` · ${persi} pers${persi === 1 ? 'a' : 'e'}` : '')
    : 'niente qui';

  let h = `<div class="momento f-${stato}">
    <div class="mo-t"><span class="ico">${m.ico}</span>${m.t}
      <span class="st">${cont}</span></div>
    <div class="mo-q">${esc(m.q)}${orario ? ` · ${esc(orario)}` : ''}</div>`;

  if (!items.length) h += `<div class="empty" style="padding:12px">Niente in questa fascia.</div>`;

  items.forEach((a, i) => {
    const st = stati[i];
    const ev = a.verso === 'evitare';
    const cls = st === 'fatto' ? 'done' : (st ? 'skip' : '');
    const dh = a.adhkar_id ? store.get('adhkar', a.adhkar_id) : null;   /* testo canonico */
    const az = a.azione_id ? store.get('azioni', a.azione_id) : null;   /* da dove nasce */
    const oraL = store.oraLabel(a);
    h += `<div class="task ${cls} ${ev ? 'ev' : ''}">
      <div class="b"><div class="nm">${esc(a.nome)}
        ${ev ? '<span class="vs-ev">da evitare</span>' : ''}
        ${a.ripetizioni ? `<span class="rep">${esc(a.ripetizioni)}</span>` : ''}
        ${oraL ? `<span class="oral">${esc(oraL)}</span>` : ''}
        ${st === 'auto' ? `<span class="skipped">${m.sempre ? 'persa — è passato il Maghrib' : 'persa — la fascia è passata'}</span>` : ''}
        ${st === 'saltato' ? `<span class="skipped">${ev ? 'ci sono cascato' : 'saltata'}</span>` : ''}</div>
      ${dh && dh.arabo ? `<div class="arx">${esc(dh.arabo)}</div>` : ''}
      ${dh && dh.traduzione ? `<div class="tr">${esc(dh.traduzione)}</div>` : ''}
      ${dh ? pillLinks(dh) : ''}
      ${az ? `<div class="why"><span class="pill az" onclick="openStudioDetail('azioni','${az.id}')">⚖️ ${esc(az.titolo)}</span></div>` : ''}</div>
      <div class="acts">
        <button class="tb ok ${st === 'fatto' ? 'on' : ''}" title="${ev ? 'Non ci sono cascato' : 'Fatto'}" onclick="setAtt('${a.id}','fatto')">✓</button>
        <button class="tb no ${st === 'saltato' || st === 'auto' ? 'on' : ''}" title="${ev ? 'Ci sono cascato' : 'Saltato'}" onclick="setAtt('${a.id}','saltato')">✕</button>
      </div></div>`;
  });
  return h + '</div>';
}

/* la lettura del Corano: non è un'attività, è un filo che non finisce mai */
function bloccoLettura() {
  const L = store.lettura(); const s = suraOf(L.sura_id);
  const dove = L.attivo
    ? `${s ? s.translit + ' ' : ''}${s ? s.numero : ''}:${L.aya || 'inizio'}`
    : 'nessun khatam in corso';
  return `<div class="filo" onclick="nav('lettura')" title="Riprendi la lettura">
    <div class="fi-t"><span class="ico">📖</span>Lettura
      <span class="st">${L.attivo ? 'riprendi →' : 'inizia →'}</span></div>
    <div class="fi-dove">${esc(dove)}</div>
    <div class="prog"><i style="width:${L.pct}%"></i></div>
    <div class="fi-m">${L.pct}% del Corano · khatam completati ${L.khatam}</div>
  </div>`;
}

/* la memorizzazione: dove sei arrivato e quanto manca per oggi */
function bloccoMemoria() {
  const S = store.statMem();
  const P = S.piano;
  let dentro;
  if (P) {
    const resta = P.restanoOggi;
    dentro = `<div class="fi-dove">${resta ? `${resta} versett${resta === 1 ? 'o' : 'i'} per oggi` : 'oggi sei in pari ✓'}</div>
      <div class="prog"><i style="width:${Math.min(100, P.pctObiettivo)}%"></i></div>
      <div class="fi-m">${P.pctObiettivo}% del piano · giorno ${P.giorno} di ${P.totGiorni}${
        P.scarto < 0 ? ` · ${-P.scarto} indietro` : (P.scarto > 0 ? ` · ${P.scarto} avanti` : '')}</div>`;
  } else {
    dentro = `<div class="fi-dove">nessun piano in corso</div>
      <div class="prog"><i style="width:${Math.min(100, S.pctCorano)}%"></i></div>
      <div class="fi-m">${S.tot} versetti memorizzati · ${S.pctCorano}% del Corano</div>`;
  }
  return `<div class="filo" onclick="nav('memorizzazione')" title="Continua a memorizzare">
    <div class="fi-t"><span class="ico">🧠</span>Memorizzazione
      <span class="st">${P ? 'continua →' : 'apri →'}</span></div>
    ${dentro}
  </div>`;
}

/* segna un'attività fatta o saltata (ripremere lo stesso stato lo annulla) */
function setAtt(id, stato) { store.setStato(id, stato); renderOggi(); }
/* assegna o toglie l'orario fisso di un'attività */
function setOra(id, ora) {
  store.setOra(id, ora);
  renderOggi();
  toast(ora ? 'Orario impostato · ' + ora : 'Orario rimosso');
}

/* ============================================================
   LETTURA
   ============================================================ */
let ltCarico = 0;   /* ultimo centro richiesto: evita caricamenti doppi */
function renderLettura() {
  const L = store.lettura();
  const active = store.activeKhatam();
  /* Il segnalibro vive su khatam.aya_id come indice globale 1–6236: va confrontato
     con quello. Su `active` non esistono sura_id/aya — chi li leggeva otteneva
     undefined, e il segnalibro non si accendeva mai. */
  const bmIdx = active ? (active.aya_id || 0) : 0;
  const done = store.khatamDone();
  aggiornaLettoreUi();   /* la barra vive su body, fuori dai re-render della pagina */
  let html = dayHeader('La lettura');

  /* pannello khatam: contatore + % + crea/ferma/elimina */
  html += `<div class="khatam-panel"><div class="kh-row">
    <div class="kh-count"><div class="n">${done}</div><div class="l">khatam<br>completati</div></div>`;
  if (active) {
    const s = suraOf(L.sura_id);
    html += `<div class="kh-active">
      <div class="kh-lab">Khatam #${active.numero} in corso</div>
      <div class="kh-pos">${s ? s.translit : ''} ${s ? s.numero : ''}:${L.aya || 'inizio'} · <b>${L.pct}%</b> del Corano</div>
      <div class="prog"><i style="width:${L.pct}%"></i></div>
      <div class="kh-btns">
        <button class="kh-b done" ${L.pct >= 100 ? '' : 'disabled'} title="${L.pct >= 100 ? 'Completa il khatam' : 'Porta il segnalibro all’ultimo versetto (114:6) per completare'}" onclick="openKhatamComplete()">✓ Completato</button>
        <button class="kh-b stop" title="Lo metti in pausa: riprende da dove sei" onclick="store.stopKhatam();renderLettura();toast('Khatam sospeso — lo riprendi quando vuoi')">⏸ Sospendi</button>
        <button class="kh-b del" title="Lo cancella per sempre" onclick="if(confirm('Eliminare il khatam #${active.numero}? Non potrai riprenderlo.')){store.deleteKhatam('${active.id}');renderLettura();toast('Khatam eliminato')}">🗑 Elimina</button>
      </div></div>`;
  } else {
    const f = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    html += `<div class="kh-active">
      <div class="kh-lab">Nessun khatam in corso</div>
      <div class="kh-pos">In quanto tempo vuoi finirlo? Lo divido in parti uguali e ti dico ogni giorno dove arrivare.</div>
      <div class="chips kh-quick">
        ${[['30', 'un mese'], ['60', 'due mesi'], ['90', 'tre mesi'], ['365', 'un anno']].map(([g, l]) =>
      `<span class="chip" onclick="khSetGiorni(${g})">${l}</span>`).join('')}
      </div>
      <div class="kh-start">
        <label>Entro il</label><input type="date" id="kh-fine" value="${f}">
        <button class="kh-b start" onclick="avviaKhatam()">▶ Inizia</button>
      </div>
    </div>`;
  }
  html += `</div></div>`;

  /* --- il piano: dove dovrei essere oggi --- */
  const P = active ? store.pianoKhatam() : null;
  if (P) {
    const avanti = P.scarto >= 0;
    const gg = Math.abs(P.scarto) / Math.max(1, P.alGiorno);
    html += `<div class="piano ${avanti ? 'ok' : 'late'} ${P.scaduto ? 'over' : ''}">
      <div class="pi-top">
        <div><span class="pi-g">Giorno ${P.giorno} di ${P.totGiorni}</span>
          <span class="pi-s">${P.alGiorno} versetti al giorno${P.giorniRimasti ? ` · ${P.giorniRimasti} giorni rimasti` : ' · ultimo giorno'}</span></div>
        <div class="pi-badge">${P.scarto === 0 ? 'in pari'
        : avanti ? `avanti di ${P.scarto}` : `indietro di ${-P.scarto}`}
        ${P.scarto !== 0 && gg >= 0.5 ? `<span class="pi-gg">≈ ${gg.toFixed(1)} giorni</span>` : ''}</div>
      </div>
      <div class="prog prog2">
        <i class="reale" style="width:${P.pctLetto}%"></i>
        <span class="tacca" style="left:${P.pctPiano}%" title="dove dovresti essere"></span>
      </div>
      <div class="pi-oggi">
        ${P.daLeggereOggi > 0
        ? `<b>Oggi</b> leggi da <b>${esc(store.fmtPos(P.partireDa))}</b> fino a <b>${esc(store.fmtPos(P.fermarsiA))}</b>
             <span class="pi-n">${P.daLeggereOggi} versetti</span>`
        : `<b>Oggi sei a posto.</b> Il traguardo di giornata era ${esc(store.fmtPos(P.fermarsiA))}, l'hai già superato.`}
      </div>
      ${P.scaduto ? `<div class="pi-warn">Il periodo che ti eri dato è finito. Puoi continuare comunque: il conto dei versetti resta.</div>` : ''}
    </div>`;
  }

  /* --- khatam sospesi: si riprendono da dove erano --- */
  const sosp = store.khatamSospesi();
  if (!active && sosp.length) {
    html += `<div class="hd">Sospesi</div>`;
    html += sosp.map(k => {
      const p = store._ayaDaIndice(Math.max(1, store._ayaIndex(k.sura_id, k.aya)));
      return `<div class="att-row">
        <div class="ar-b"><div class="ar-n">Khatam #${k.numero}</div>
        <div class="ar-m">fermo a ${esc(store.fmtPos(p))} · ${store._pct(k.sura_id, k.aya)}%${k.scadenza ? ' · scadenza era ' + esc(k.scadenza) : ''}</div></div>
        <button class="kh-b start" onclick="store.resumeKhatam('${k.id}');renderLettura();toast('Ripreso da dove eri')">▶ Riprendi</button>
        <button class="tb no" title="Elimina" onclick="if(confirm('Eliminare il khatam #${k.numero}?')){store.deleteKhatam('${k.id}');renderLettura()}">✕</button>
      </div>`;
    }).join('');
  }

  /* --- completati: lo storico. Solo quando NON stai leggendo:
         con un khatam in corso servono il piano e il Corano, non l'archivio. --- */
  const fatti = store.khatamCompletati();
  if (!active && fatti.length) {
    html += `<div class="hd">Completati <span class="hd-c">${fatti.length}</span></div>`;
    html += fatti.map(k => {
      const D = store.durataKhatam(k);
      let riga;
      if (D) {
        const vs = D.vsPiano === null ? ''
          : D.vsPiano > 0 ? `<span class="kc-ok">${D.vsPiano} giorni in anticipo</span>`
            : D.vsPiano === 0 ? `<span class="kc-ok">proprio in tempo</span>`
              : `<span class="kc-late">${-D.vsPiano} giorni oltre</span>`;
        riga = `${esc(k.iniziato_il)} → ${esc(k.completato_il)} · <b>${D.giorni} giorni</b> · ${D.ritmo} versetti al giorno ${vs}`;
      } else {
        riga = k.completato_il ? `completato il ${esc(k.completato_il)}` : 'durata non registrata';
      }
      return `<div class="att-row kc">
        <div class="kc-seal">۩</div>
        <div class="ar-b"><div class="ar-n">Khatam #${k.numero}</div>
        <div class="ar-m">${riga}</div></div>
      </div>`;
    }).join('');
  }

  if (!active) {
    html += `<div class="empty">Avvia un khatam per iniziare a leggere e muovere il segnalibro.</div>`;
    $('#p-lettura').innerHTML = html;
    return;
  }

  /* --- la finestra dei versetti è UNA e condivisa: la Memorizzazione la
         sposta sulla sua sura di studio, quindi prima di disegnare
         controllo che contenga il segnalibro, e se no torno da lui.
         Stesso idioma (e stessa guardia) di renderMemorizzazione. --- */
  const centro = Math.max(1, bmIdx);
  if (!store.list('ayat_demo').some(v => v.id === centro)) {
    $('#p-lettura').innerHTML = html + `<div class="empty">Torno al segnalibro…</div>`;
    if (ltCarico !== centro) {               /* guardia: mai due caricamenti uguali di fila */
      ltCarico = centro;
      store.caricaAyat({ da: Math.max(1, centro - 3) }).then(() => renderLettura());
    }
    return;
  }
  ltCarico = 0;   /* caricata: la prossima deriva della finestra può ripartire */

  /* --- due modi di leggere lo stesso testo --- */
  const modo = (store.getSettings().vista.lettore) || 'flusso';
  html += `<div class="lettore-tab">
    <span class="chip ${modo === 'flusso' ? 'sel' : ''}" onclick="setLettore('flusso')">📜 Flusso</span>
    <span class="chip ${modo === 'pagina' ? 'sel' : ''}" onclick="setLettore('pagina')">📖 Pagina</span>
    ${tajChip('renderLettura()')}
  </div>` + tajLegenda();
  if (modo === 'pagina') {
    html += renderMushaf({ modo: 'lettura', bmIdx }) + bloccoContinua();
    $('#p-lettura').innerHTML = html; armaSentinella(); return;
  }

  let lastSura = null, lastPagina = null, traguardoMesso = false;
  store.list('ayat_demo').forEach(v => {
    const s = suraOf(v.sura_id);
    const idx = store.idxDi(s.numero, v.aya);

    /* --- traguardo del giorno: dove il piano dice di arrivare.
           È una riga, non un muro: sotto il testo prosegue. --- */
    if (P && !traguardoMesso && idx > P.target) {
      traguardoMesso = true;
      html += `<div class="traguardo">
        <span class="tg-l">⌁ traguardo di oggi</span>
        <span class="tg-s">${P.daLeggereOggi > 0 ? 'quello che leggi da qui è in più' : 'già superato'}</span>
        <button class="tg-b" onclick="store.setBookmark(${v.sura_id},${v.aya});renderLettura();toast('Segnalibro sul traguardo')">⛿ segna qui</button>
      </div>`;
    }

    /* --- inizio di un juz --- */
    const j = store.inizioJuz(idx);
    if (j) html += `<div class="juz-sep"><span>juz ${j}</span></div>`;

    /* --- cambio pagina del muṣḥaf: attivo solo quando il dato esiste (post-import) --- */
    if (v.pagina && v.pagina !== lastPagina) {
      lastPagina = v.pagina;
      html += `<div class="pag-sep"><span>pagina ${v.pagina}</span></div>`;
    }

    if (v.sura_id !== lastSura) {
      html += `<div class="sura-sep">Sura ${s.numero} · ${s.translit} · ${s.nome_arabo}
        <span class="ss-j">juz ${store.juzDi(idx)} · ${esc(s.rivelazione || '')}</span></div>`;
      lastSura = v.sura_id;
    }
    const isBm = bmIdx > 0 && idx === bmIdx;
    const isHl = store.isHl(v.sura_id, v.aya);
    if (isBm) html += `<div class="marker">⛿ il tuo segnalibro · ${s.numero}:${v.aya}</div>`;
    /* qui si legge e basta: contesto, accadimenti e pensieri stanno nella scheda del versetto */
    html += `<div class="aya-row ${isHl ? 'hl' : ''}${Lettore.idx === idx ? ' leggendo' : ''}" data-idx="${idx}"><div class="num">${v.aya}</div>
    <div class="tx"><div class="arq">${arTaj(v)}</div><div class="itq">${esc(v.it)}</div></div>
    <div class="act">
      <button class="ab bm ${isBm ? 'on' : ''}" aria-pressed="${isBm}" title="${isBm ? 'Il segnalibro è qui' : 'Metti il segnalibro'}" onclick="store.setBookmark(${v.sura_id},${v.aya});renderLettura();toast('Segnalibro su ${s.numero}:${v.aya}')">⛿</button>
      <button class="ab hlb ${isHl ? 'on' : ''}" aria-pressed="${isHl}" title="${isHl ? 'Togli evidenziazione' : 'Evidenzia'}" onclick="store.toggleHl(${v.sura_id},${v.aya});renderLettura()">🖊</button>
      <button class="ab go-aya" title="Scheda del versetto — contesto, accadimenti, pensieri" onclick="apriAya(${v.sura_id},${v.aya})">⋯</button>
    </div></div>`;
  });
  /* il traguardo cade più avanti di quanto è caricato: lo dico invece di tacerlo */
  if (P && !traguardoMesso && P.daLeggereOggi > 0) {
    html += `<div class="traguardo lontano">
      <span class="tg-l">⌁ traguardo di oggi</span>
      <span class="tg-s">più avanti, a ${esc(store.fmtPos(P.fermarsiA))} · ${P.daLeggereOggi} versetti da qui</span></div>`;
  }
  html += bloccoContinua();
  html += `<div class="sujud"><div class="l">۩ Versetti di prosternazione</div>Quando arrivi a un'aya col simbolo ۩, l'app mostrerà la tua dua del sujūd. Al completamento del khatam: la dua di completamento e +1 al contatore.</div>`;
  $('#p-lettura').innerHTML = html;
  armaSentinella();
}

/* scorciatoie "un mese / due mesi…": spostano la data di fine */
function khSetGiorni(g) {
  const i = $('#kh-fine'); if (!i) return;
  i.value = new Date(Date.now() + g * 86400000).toISOString().slice(0, 10);
  document.querySelectorAll('.kh-quick .chip').forEach(c => c.classList.remove('sel'));
  if (event && event.target) event.target.classList.add('sel');
}
function avviaKhatam() {
  const fine = $('#kh-fine') ? $('#kh-fine').value : '';
  if (!fine) { toast('Scegli entro quando vuoi finirlo'); return; }
  if (fine <= store.today()) { toast('La data deve essere nel futuro'); return; }
  store.newKhatam(fine);
  renderLettura();
  const P = store.pianoKhatam();
  toast(P ? `Khatam avviato · ${P.alGiorno} versetti al giorno` : 'Khatam avviato');
}

/* dal lettore alla scheda del versetto: stesso testo, ma con tutto intorno.
   Se quell'aya non è ancora una riga di `versetti`, la creo al volo. */
async function apriAya(sid, aya) {
  let v = store.list('versetti').find(x => x.sura_id === +sid && x.aya === +aya);
  if (!v) {
    /* fuori dalla finestra caricata: la chiedo al database */
    const r = await store.cercaAyat({ sura: sid, numero: aya, limite: 1 });
    v = r[0];
    if (!v) { toast('Versetto non trovato'); return; }
    store.ricordaAya(v);
  }
  openDetail('versetto', v.id);
}

/* ---- vista muṣḥaf: testo arabo continuo, come sulla pagina stampata ----
   Qui non c'è traduzione né righe separate: il testo scorre giustificato e i
   versetti sono divisi dal simbolo ۝ col numero in cifre arabo-indiane.
   Quando `ayat.pagina` esisterà, questo diventa UNA pagina alla volta con le
   frecce; oggi rende tutto ciò che è caricato. */
const cifreArabe = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

/* ---- colori del tajwīd ----
   Gli intervalli vivono in ayat.tajweed, forma compatta [[codice,da,a],…],
   con gli offset in codepoint ancorati al NOSTRO testo_ar (rimappati e
   verificati il 19 ago 2026 — vedi SCHEMA.md). Qui si affetta il testo
   e ogni intervallo si veste della sua classe. */
const TAJ_NOMI = {
  gn: 'ghunnah', hw: 'hamzat al-waṣl', ig: 'idghām con ghunnah',
  imj: 'idghām mutajānisayn', imq: 'idghām mutaqāribayn', ing: 'idghām senza ghunnah',
  ish: 'idghām shafawī', ik: 'ikhfāʾ', iks: 'ikhfāʾ shafawī', iq: 'iqlāb',
  ls: 'lām shamsiyyah', m2: 'madd naturale (2)', m246: 'madd ʿāriḍ (2-4-6)',
  m6: 'madd lāzim (6)', mmf: 'madd munfaṣil (4-5)', mmt: 'madd muttaṣil (4-5)',
  q: 'qalqalah', sil: 'lettera muta',
};
const tajwidOn = () => (store.getSettings().vista || {}).tajwid !== false;
function arTaj(v) {
  const ann = v.tajweed;
  if (!tajwidOn() || !Array.isArray(ann) || !ann.length || !Array.isArray(ann[0])) return esc(v.arabo);
  const t = [...v.arabo];          /* codepoint, non unità UTF-16 */
  let h = '', p = 0;
  for (const [c, s, e] of ann) {
    const da = Math.max(s, p);     /* le rare sovrapposizioni: vince chi arriva prima */
    if (da >= e || e > t.length) continue;
    h += esc(t.slice(p, da).join('')) +
      `<span class="tj ${c}" title="${TAJ_NOMI[c] || c}">` + esc(t.slice(da, e).join('')) + '</span>';
    p = e;
  }
  return h + esc(t.slice(p).join(''));
}
const tajChip = ricarica => `<span class="chip ${tajwidOn() ? 'sel' : ''}"
  onclick="store.setSettings({vista:{tajwid:${!tajwidOn()}}});${ricarica}">🎨 Tajwīd</span>`;
function tajLegenda() {
  if (!tajwidOn()) return '';
  return `<details class="taj-legenda"><summary>i colori del tajwīd</summary><div class="tl-w">${
    Object.keys(TAJ_NOMI).map(c => `<span><b class="tj ${c}">⬤</b> ${TAJ_NOMI[c]}</span>`).join('')
  }</div></details>`;
}

/* cfg.modo: 'lettura' (segnalibro, click = scheda) | 'memoria' (click = memorizzato) */
function renderMushaf(cfg) {
  const ayat = store.list('ayat_demo');
  const mem = cfg.modo === 'memoria';
  let h = '', lastSura = null, aperto = false, nMem = 0, nTot = 0;

  ayat.forEach(v => {
    const s = suraOf(v.sura_id);
    if (v.sura_id !== lastSura) {
      if (aperto) h += `</div><div class="mushaf-foot">${lastPag(lastSura)}</div></div>`;
      lastSura = v.sura_id; aperto = true;
      h += `<div class="mushaf">
        <div class="mushaf-head"><span class="mh-ar">${esc(s.nome_arabo)}</span>
          <span class="mh-n">${s.numero} · ${esc(s.translit)} · ${esc(s.rivelazione || '')}</span></div>
        ${s.numero !== 1 && s.numero !== 9 ? '<div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>' : ''}
        <div class="mushaf-text" dir="rtl">`;
    }
    nTot++;
    let cls = '', click, tit, dataIdx = '';
    if (mem) {
      const m = store.isMem(v.sura_id, v.aya);
      if (m) nMem++;
      cls = (m ? 'mem ' : '') + (Rec.on && Rec.id === v.id ? 'leggendo' : '');
      click = `store.toggleMem(${v.sura_id},${v.aya});renderMemorizzazione()`;
      tit = `${s.numero}:${v.aya} — ${m ? 'memorizzato: tocca per togliere' : 'tocca quando lo sai'}`;
      dataIdx = ` data-idx="${v.id}"`;
    } else {
      const idx = store.idxDi(s.numero, v.aya);
      const bm = cfg.bmIdx > 0 && idx === cfg.bmIdx;
      cls = (store.isHl(v.sura_id, v.aya) ? 'hl ' : '') + (bm ? 'bm ' : '') + (Lettore.idx === idx ? 'leggendo' : '');
      click = `apriAya(${v.sura_id},${v.aya})`;
      tit = `${s.numero}:${v.aya} — apri la scheda`;
      dataIdx = ` data-idx="${idx}"`;
    }
    h += `<span class="mv ${cls}"${dataIdx} ${mem ? `onclick="${click}" title="${tit}"` : ''}>${arTaj(v)}</span><span class="mv-n" title="${tit}" onclick="${click}">۝${cifreArabe(v.aya)}</span> `;
  });
  if (aperto) h += `</div><div class="mushaf-foot">${lastPag(lastSura)}</div></div>`;

  if (mem) h = `<div class="mem-conta">${nMem} di ${nTot} versetti memorizzati qui · tocca il testo per segnarlo</div>` + h;

  h += `<div class="mushaf-note">La vera impaginazione del muṣḥaf — 604 pagine, ognuna che finisce
    sempre dove deve — arriva con l'import: serve <b>ayat.pagina</b>, che dice quale versetto sta su
    quale pagina. Da allora questa vista mostrerà una pagina per volta${mem
      ? ' — ed è quella la forma che conta per la ḥifẓ: si memorizza la <b>posizione</b> sulla pagina, non solo le parole' : ''}.</div>`;
  return h;
}
const lastPag = sid => { const s = store.get('sure', sid); return s ? `سورة ${esc(s.nome_arabo)}` : ''; };

/* ---- il lettore non finisce mai contro un muro ----
   In fondo c'è un margine che, quando lo raggiungi scorrendo, chiede
   i versetti successivi. Resta anche il bottone, per chi preferisce. */
function bloccoContinua() {
  if (store.fineCorano()) {
    return `<div class="fine-corano">۩ Sei arrivato alla fine del Corano.</div>`;
  }
  const p = store._ayaDaIndice(store.finestra().a + 1);
  return `<div class="carica-piu" id="lp-sentinella">
    <button class="kh-b start" onclick="caricaPiu()">Continua da ${esc(store.fmtPos(p))} ⌄</button>
  </div>`;
}

let lpInCorso = false, lpObs = null;
async function caricaPiu() {
  if (lpInCorso || store.fineCorano()) return;
  lpInCorso = true;
  const btn = document.querySelector('#lp-sentinella button');
  if (btn) { btn.textContent = 'Carico…'; btn.disabled = true; }
  const n = await store.caricaAncora();
  lpInCorso = false;
  if (!n) { if (btn) { btn.textContent = 'Niente altro'; } return; }
  /* la posizione si legge DOPO il fetch: col joystick in corsa, nel frattempo
     si è scesi ancora, e ripristinare quella vecchia farebbe saltare indietro */
  const y = window.scrollY;                 /* i nuovi versetti si aggiungono in coda */
  const modo = (store.getSettings().vista.lettore) || 'flusso';
  modo === 'pagina' ? renderLettura() : renderLettura();
  window.scrollTo(0, y);                    /* si resta dove si stava leggendo */
  armaSentinella();
}
/* carica da solo quando la fine entra nello schermo */
function armaSentinella() {
  if (lpObs) lpObs.disconnect();
  const s = document.getElementById('lp-sentinella');
  if (!s || !('IntersectionObserver' in window)) return;
  lpObs = new IntersectionObserver(e => { if (e[0].isIntersecting) caricaPiu(); }, { rootMargin: '400px' });
  lpObs.observe(s);
}

/* ============================================================
   LETTURA ASSISTITA — il play avanza per āya, non per pixel:
   illumina un versetto, centra la vista, aspetta in proporzione
   alla lunghezza, passa al successivo. Qualsiasi tocco = pausa.
   E i salti rapidi: torna su, torna al segnalibro senza riavviare.
   ============================================================ */
const Lettore = { attivo: false, idx: 0, target: 0, timer: null, wl: null };
const fineCoranoIdx = () => store._ayaIndex(114, 6);

function lettoreSpv() {
  const v = store.getSettings().vista || {};
  return (v.lettoreAuto && v.lettoreAuto.spv) || 5;
}
/* due modi di farsi accompagnare: joystick (il dito detta il passo)
   o automatico a secondi (mani libere). Scelta salvata nelle impostazioni. */
function lettoreModo() {
  const v = store.getSettings().vista || {};
  return (v.lettoreAuto && v.lettoreAuto.modo) || 'joystick';
}
function joyVelBase() {
  const v = store.getSettings().vista || {};
  return (v.lettoreAuto && v.lettoreAuto.vel) || 4;
}
function lettoreSetModo(m) {
  lettorePausa();
  store.setSettings({ vista: { lettoreAuto: { modo: m } } });
  aggiornaLettoreUi();
  const p = $('#vel-pop'); if (p) p.hidden = false;   /* il pannello resta aperto per regolare */
}

/* barra flottante + pannello del lettore. Vive su body, non dentro
   #p-lettura: i re-render della pagina non le strappano il bottone
   di mano (fondamentale col joystick tenuto premuto). */
function lettoreUiHtml() {
  const on = Lettore.attivo;
  const m = lettoreModo();
  const p = Lettore.idx ? store._ayaDaIndice(Lettore.idx) : null;
  const k = store.activeKhatam();
  const segnabile = !on && p && k && Lettore.idx !== (k.aya_id || 0);
  const principale = m === 'joystick'
    ? `<button class="lb-b play joy" title="Tieni premuto per scorrere — trascina giù/su per la velocità"
        onpointerdown="joyStart(event)" onpointermove="joyMove(event)"
        onpointerup="joyEnd(event)" onpointercancel="joyEnd(event)">⇕</button>`
    : `<button class="lb-b play ${on ? 'on' : ''}" title="${on ? 'Pausa' : 'Lettura assistita'}" onclick="lettoreToggle(event)">${on ? '⏸' : '▶'}</button>`;
  return `<div id="lettore-ui">
    <div class="lettore-bar">
      <button class="lb-b" title="Torna in cima" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
      <button class="lb-b" title="Vai al segnalibro" onclick="vaiAlSegnalibro(event)">⛿</button>
      ${principale}
      <button class="lb-b chip" title="Modalità e velocità" onclick="lettoreVelPop(event)">${m === 'joystick' ? '×' + joyVelBase() : lettoreSpv() + 's'}</button>
      ${segnabile ? `<button class="lb-b segna" title="Sposta il segnalibro su ${esc(store.fmtPos(p))}" onclick="lettoreSegna(event)">⛿ ${p.sura}:${p.aya}</button>` : ''}
    </div>
    <div class="vel-pop" id="vel-pop" hidden>
      <div class="vp-modo">
        <span class="chip ${m === 'joystick' ? 'sel' : ''}" onclick="lettoreSetModo('joystick')">🕹 Joystick</span>
        <span class="chip ${m === 'auto' ? 'sel' : ''}" onclick="lettoreSetModo('auto')">▶ Automatico</span>
      </div>
      ${m === 'joystick' ? `
      <div class="vp-t">Velocità di crociera: <b id="vel-val">×${joyVelBase()}</b></div>
      <input type="range" min="1" max="10" step="0.5" value="${joyVelBase()}"
        oninput="$('#vel-val').textContent='×'+this.value" onchange="lettoreSetVel(this.value)">
      <div class="vp-s">Tieni premuto ⇕ e il testo scorre. Trascina in giù per accelerare, risali per frenare; sopra il punto di presa torni indietro. Lascia il dito e si ferma.</div>`
      : `
      <div class="vp-t">Ritmo: <b id="vel-val">${lettoreSpv()}s</b> per un versetto medio</div>
      <input type="range" min="2" max="20" step="0.5" value="${lettoreSpv()}"
        oninput="$('#vel-val').textContent=this.value+'s'" onchange="lettoreSetVel(this.value)">
      <div class="vp-s">I versetti lunghi ricevono più tempo, senza tetto. Durante la lettura tocca ovunque per fermarti: resti sull'āya illuminata.</div>`}
    </div>
  </div>`;
}
function aggiornaLettoreUi() {
  let host = document.getElementById('lettore-ui-host');
  if (!host) { host = document.createElement('div'); host.id = 'lettore-ui-host'; document.body.appendChild(host); }
  host.innerHTML = store.activeKhatam() ? lettoreUiHtml() : '';
}

function lettoreToggle(e) { if (e) e.stopPropagation(); Lettore.attivo ? lettorePausa() : lettorePlay(); }

function lettorePlay() {
  const k = store.activeKhatam();
  if (!k) { toast('Avvia un khatam per la lettura assistita'); return; }
  /* si parte dall'āya dopo il segnalibro; a khatam appena nato, da 1:1 */
  if (!Lettore.idx) Lettore.idx = k.aya_id > 1 ? Math.min(fineCoranoIdx(), k.aya_id + 1) : 1;
  const P = store.pianoKhatam();
  Lettore.target = (P && Lettore.idx <= P.target) ? P.target : 0;
  Lettore.attivo = true;
  lettoreWake();
  aggiornaLettoreUi();
  lettoreStep();
}

function lettorePausa(msg) {
  if (Lettore.timer) { clearTimeout(Lettore.timer); Lettore.timer = null; }
  if (!Lettore.attivo) return;
  Lettore.attivo = false;
  if (Lettore.wl) { try { Lettore.wl.release(); } catch (e) {} Lettore.wl = null; }
  aggiornaLettoreUi();
  if (msg) toast(msg);
}

/* un passo: trova la riga dell'āya corrente (caricandola se serve),
   illuminala, centrala, programma il passo successivo */
async function lettoreStep() {
  if (!Lettore.attivo) return;
  const idx = Lettore.idx;
  /* selettore ancorato alla pagina: anche Memorizzazione ha i suoi data-idx */
  let el = document.querySelector(`#p-lettura [data-idx="${idx}"]`);
  if (!el) {
    /* la sentinella sta già caricando: le lascio finire il lavoro */
    if (lpInCorso) { Lettore.timer = setTimeout(lettoreStep, 300); return; }
    const w = store.finestra();
    lpInCorso = true;
    let ok;
    if (w.a && idx > w.a) ok = await store.caricaAncora(120);
    else ok = (await store.caricaAyat({ da: Math.max(1, idx - 3) })).length;
    lpInCorso = false;
    if (!Lettore.attivo) return;             /* pausa arrivata durante il caricamento */
    if (!ok) { lettorePausa('Non riesco a caricare i versetti da qui'); return; }
    renderLettura();
    el = document.querySelector(`#p-lettura [data-idx="${idx}"]`);
    if (!el) { lettorePausa(); return; }
  }
  document.querySelectorAll('#p-lettura .leggendo').forEach(x => x.classList.remove('leggendo'));
  el.classList.add('leggendo');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const v = store.get('versetti', idx);      /* l'id delle ayat È l'indice globale */
  const parole = v && v.arabo ? v.arabo.trim().split(/\s+/).length : 12;
  /* niente tetto: un versetto lungo ha diritto a tutto il suo tempo */
  const sec = Math.max(2.5, lettoreSpv() * parole / 12);
  Lettore.timer = setTimeout(lettoreAvanza, sec * 1000);
}

function lettoreAvanza() {
  if (!Lettore.attivo) return;
  if (Lettore.target && Lettore.idx >= Lettore.target) {
    lettorePausa('⌁ Traguardo di oggi raggiunto — ▶ se vuoi continuare'); return;
  }
  if (Lettore.idx >= fineCoranoIdx()) { lettorePausa('۩ Sei alla fine del Corano'); return; }
  Lettore.idx++;
  lettoreStep();
}

/* durante il play qualsiasi tocco fa solo pausa: i bottoni non scattano,
   niente azioni accidentali mentre lo schermo scorre */
document.addEventListener('click', e => {
  if (!Lettore.attivo) return;
  e.preventDefault(); e.stopPropagation();
  lettorePausa('In pausa — ▶ per riprendere da qui');
}, true);

/* lo schermo non deve spegnersi mentre il lettore ti accompagna */
async function lettoreWake() {
  try { Lettore.wl = await navigator.wakeLock.request('screen'); } catch (e) { /* niente wake lock: pazienza */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') lettorePausa();
  else if (Lettore.attivo) lettoreWake();
});

function lettoreSetVel(v) {
  const auto = lettoreModo() === 'auto';
  store.setSettings({ vista: { lettoreAuto: auto ? { spv: +v } : { vel: +v } } });
  const chip = document.querySelector('#lettore-ui .lb-b.chip');
  if (chip) chip.textContent = auto ? (+v) + 's' : '×' + (+v);
}
function lettoreVelPop(e) { if (e) e.stopPropagation(); const p = $('#vel-pop'); if (p) p.hidden = !p.hidden; }

/* ---- joystick: tieni premuto = scorri; giù accelera, su frena/indietro.
   Il punto dove appoggi il dito è lo zero: la distanza da lì è la velocità. ---- */
const Joy = { on: false, y0: 0, dy: 0, raf: null, last: 0, btn: null };
function joyStart(e) {
  e.preventDefault(); e.stopPropagation();
  Joy.btn = e.currentTarget;
  try { Joy.btn.setPointerCapture(e.pointerId); } catch (err) {}
  Joy.on = true; Joy.y0 = e.clientY; Joy.dy = 0; Joy.last = 0;
  Joy.btn.classList.add('grip');
  Joy.raf = requestAnimationFrame(joyTick);
}
function joyMove(e) {
  if (!Joy.on) return;
  Joy.dy = e.clientY - Joy.y0;
  const f = joyFattore();
  Joy.btn.textContent = f < 0 ? '↺' : '×' + f.toFixed(1);
}
function joyEnd() {
  if (!Joy.on) return;
  Joy.on = false;
  if (Joy.raf) { cancelAnimationFrame(Joy.raf); Joy.raf = null; }
  Joy.btn.classList.remove('grip');
  Joy.btn.textContent = '⇕';
}
/* fattore dal dito: ×1 allo zero, cresce scendendo (fino a ×8),
   ×0 a 40px sopra lo zero, poi retromarcia dolce */
function joyFattore() {
  const dy = Joy.dy;
  if (dy >= -40) return Math.min(8, 1 + dy / 40);
  return Math.max(-1.5, (dy + 40) / 60);
}
function joyTick(ts) {
  if (!Joy.on) return;
  if (Joy.last) {
    const dt = Math.min(0.1, (ts - Joy.last) / 1000);
    window.scrollBy(0, joyVelBase() * 12 * joyFattore() * dt);
  }
  Joy.last = ts;
  Joy.raf = requestAnimationFrame(joyTick);
}

/* la pausa lascia l'āya illuminata: un tocco e diventa il segnalibro */
function lettoreSegna(e) {
  if (e) e.stopPropagation();
  if (!Lettore.idx) return;
  const p = store._ayaDaIndice(Lettore.idx);
  store.setBookmark(p.sura, p.aya);
  renderLettura();
  toast('⛿ Segnalibro su ' + store.fmtPos(p));
}

/* torna al segnalibro senza chiudere l'app: se è fuori dalla finestra
   caricata, la ricarico attorno a lui — come fa l'avvio */
async function vaiAlSegnalibro(e) {
  if (e) e.stopPropagation();
  const k = store.activeKhatam();
  if (!k) { toast('Nessun khatam attivo'); return; }
  const bm = Math.max(1, k.aya_id || 1);
  const w = store.finestra();
  const dentro = !store.suraInFinestra() && bm >= w.da && bm <= w.a;
  Lettore.idx = 0;                     /* il play riparte dal segnalibro */
  if (!dentro) await store.caricaAyat({ da: Math.max(1, bm - 3) });
  renderLettura();
  const el = document.querySelector(`#p-lettura [data-idx="${bm}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setLettore(m) {
  store.setSettings({ vista: { lettore: m } });
  renderLettura();
}
function setMemVista(m) {
  store.setSettings({ vista: { memorizzatore: m } });
  renderMemorizzazione();
}

function addThought(sid, aya) {
  const inp = document.getElementById('th-' + aya); const txt = inp.value.trim();
  if (!txt) { toast('Scrivi prima il pensiero'); return; }
  let v = store.list('versetti').find(x => x.sura_id === sid && x.numero === aya);
  if (!v) {
    const demo = store.list('ayat_demo').find(x => x.aya === aya) || {};
    v = store.add('versetti', { sura_id: sid, numero: aya, arabo: demo.arabo || '', traduzione: demo.it || '', contesto: '', nota: '' });
  }
  store.addPensiero(txt, [{ tipo: 'versetto', id: v.id }]);
  inp.value = ''; counts();
  toast('Pensiero salvato · ancorato a ' + suraOf(sid).numero + ':' + aya);
}

/* completamento khatam: popup congratulazioni + duʿāʾ + pensiero */
function openKhatamComplete() {
  if (!store.completeKhatam()) { toast('Arriva prima all’ultimo versetto'); return; }
  const t = $('#kh-thought'); if (t) t.value = '';
  $('#veil-khatam').classList.add('on');
  renderLettura();                 /* aggiorna il pannello dietro: +1 completato */
}
function closeKhatamComplete() { $('#veil-khatam').classList.remove('on'); }
function saveKhatamThought() {
  const t = $('#kh-thought'); const txt = t ? t.value.trim() : '';
  if (txt) { store.addPensiero(txt, []); counts(); toast('Pensiero salvato'); }
  closeKhatamComplete();
}

/* ============================================================
   MEMORIZZAZIONE — bozza. Simile a Lettura ma con Piano di studio
   (annuale di default) e selezione per ḥizb / ottava (thumn).
   Il Corano ha 604 pagine, 60 ḥizb, 8 ottave per ḥizb.
   ============================================================ */
const PIANI = {
  annuale:        { label: 'Annuale — tutto il Corano in 12 mesi', desc: 'Obiettivo: 60 ḥizb in 12 mesi · 5 ḥizb al mese · ~1,3 ottave al giorno (≈ 2 pagine).' },
  biennale:       { label: 'Biennale — in 24 mesi',                desc: 'Obiettivo: 60 ḥizb in 24 mesi · ~2–3 ḥizb al mese · ~1 pagina al giorno.' },
  personalizzato: { label: 'Personalizzato',                       desc: 'Ritmo e obiettivo li definirai tu (in costruzione).' },
};
const mzSeq = n => Array.from({ length: n }, (_, i) => i + 1);
/* evita di richiedere due volte di fila lo stesso caricamento */
let mzCarico = null;
/* quanti versetti di quella sura hai già memorizzato */
function mzFattiInSura(n) {
  const da = store.idxDi(n, 1), a = store.idxDi(n, store.vvSura(n));
  return store.list('memorizzato').filter(m => m.aya_id >= da && m.aya_id <= a).length;
}
/* stima pagine del muṣḥaf (604) per ḥizb e per ottava — approssimata, in bozza */
function hizbPages(h) { return [Math.round((h - 1) * 604 / 60) + 1, Math.round(h * 604 / 60)]; }
function ottavaPages(h, o) {
  const [s, e] = hizbPages(h); const span = (e - s + 1) / 8;
  const ps = Math.floor(s + (o - 1) * span);
  return [ps, Math.max(ps, Math.round(s + o * span) - 1)];
}

/* ------------------------------------------------------------
   Grafico dell'andamento. Due letture della stessa cosa:
   'giorno'   = quanto ho fatto ogni giorno, contro la quota che il piano chiede;
   'cumulato' = il totale accumulato, contro la retta che il piano disegna.
   SVG scritto a mano: niente librerie, niente build.
   ------------------------------------------------------------ */
let mzGraf = { vista: 'giorno', giorni: 30, piano: null };
function setMzGrafVista(v) { mzGraf.vista = v; renderMemorizzazione(); }
function setMzGrafGiorni(g) { mzGraf.giorni = +g; renderMemorizzazione(); }

function mzChart(P) {
  const A = store.andamentoMem(P && P.id);
  if (!A) return '';
  const dm = g => g.slice(8, 10) + '/' + g.slice(5, 7);
  const nv = v => v.toLocaleString('it');
  const passati = A.giorni.filter(g => !g.futuro);
  const tutto = !mzGraf.giorni;
  /* nel cumulato su "tutto" si vede anche il futuro: è lì che la retta del piano arriva */
  const vis = (mzGraf.vista === 'cumulato' && tutto) ? A.giorni
    : (tutto ? passati : passati.slice(-mzGraf.giorni));
  const n = vis.length;

  const W = 720, H = 190, padL = 44, padR = 14, padT = 14, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const bw = iw / n, base = padT + ih;
  const xc = i => padL + bw * (i + .5);

  const tabs = [['giorno', 'Giorno per giorno'], ['cumulato', 'Cumulato']]
    .map(([k, l]) => `<span class="chip ${mzGraf.vista === k ? 'sel' : ''}" onclick="setMzGrafVista('${k}')">${l}</span>`).join('');
  const range = [[14, '14 g'], [30, '30 g'], [90, '90 g'], [0, 'tutto']]
    .map(([g, l]) => `<span class="chip ${mzGraf.giorni === g ? 'sel' : ''}" onclick="setMzGrafGiorni(${g})">${l}</span>`).join('');

  let corpo = '', legenda = '', riga = '';

  if (mzGraf.vista === 'giorno') {
    const maxN = Math.max(A.quota, ...vis.map(g => g.n || 0));
    const yMax = Math.max(1, maxN * 1.18);
    const y = v => padT + ih - (v / yMax) * ih;
    const w = Math.max(1, Math.min(20, bw * .68));
    const yq = y(A.quota);

    const barre = vis.map((g, i) => {
      const v = g.n || 0;
      const h = v ? Math.max(1.5, base - y(v)) : 2;
      const cls = v === 0 ? 'zero' : (v >= A.quota ? 'pieno' : '');
      return `<rect class="barra ${cls}${g.oggi ? ' oggi' : ''}" x="${(xc(i) - w / 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(2, w / 2).toFixed(1)}"><title>${dm(g.data)} — ${v} ${v === 1 ? 'versetto' : 'versetti'}${g.oggi ? ' (oggi)' : ''}</title></rect>`;
    }).join('');

    corpo = `${barre}
      <line class="quota" x1="${padL}" y1="${yq.toFixed(1)}" x2="${W - padR}" y2="${yq.toFixed(1)}"/>
      <text class="asse q" x="${W - padR}" y="${(yq - 5).toFixed(1)}" text-anchor="end">il piano ne chiede ${Math.ceil(A.quota)} al giorno</text>
      <line class="base" x1="${padL}" y1="${base}" x2="${W - padR}" y2="${base}"/>
      <text class="asse" x="${padL - 8}" y="${base + 3}" text-anchor="end">0</text>
      <text class="asse" x="${padL - 8}" y="${padT + 8}" text-anchor="end">${Math.round(yMax)}</text>
      <text class="asse" x="${padL}" y="${H - 5}">${dm(vis[0].data)}</text>
      <text class="asse" x="${W - padR}" y="${H - 5}" text-anchor="end">${dm(vis[n - 1].data)}</text>`;

    const somma = vis.reduce((s, g) => s + (g.n || 0), 0);
    const attivi = vis.filter(g => g.n > 0).length;
    const media = Math.round(somma / n * 10) / 10;
    riga = `${attivi} giorni su ${n} con qualcosa fatto · media <b>${nv(media)}</b> al giorno contro i <b>${Math.ceil(A.quota)}</b> richiesti`;
    legenda = `<span><i class="q pieno"></i>quota raggiunta</span><span><i class="q"></i>sotto la quota</span><span><i class="linea attesa"></i>linea del piano</span>`;

  } else {
    const yMax = Math.max(A.meta, ...vis.map(g => g.cum || 0)) * 1.02;
    const y = v => padT + ih - (v / yMax) * ih;
    const reali = vis.filter(g => !g.futuro);
    const ultimo = reali[reali.length - 1];
    const pPiano = vis.map((g, i) => `${xc(i).toFixed(1)},${y(g.piano).toFixed(1)}`).join(' ');
    const pReale = reali.map((g, i) => `${xc(i).toFixed(1)},${y(g.cum).toFixed(1)}`).join(' ');
    const area = `${xc(0).toFixed(1)},${base} ${pReale} ${xc(reali.length - 1).toFixed(1)},${base}`;
    const yMeta = y(A.meta);

    /* zone invisibili per il passaggio del mouse: dicono giorno per giorno come stai */
    const hover = vis.map((g, i) => {
      const t = g.futuro
        ? `${dm(g.data)} — il piano dice ${nv(Math.round(g.piano))}`
        : `${dm(g.data)} — ${nv(g.cum)} memorizzati · il piano dice ${nv(Math.round(g.piano))} (${g.cum - Math.round(g.piano) >= 0 ? '+' : ''}${nv(g.cum - Math.round(g.piano))})`;
      return `<rect class="hover" x="${(padL + bw * i).toFixed(1)}" y="${padT}" width="${bw.toFixed(2)}" height="${ih}"><title>${t}</title></rect>`;
    }).join('');

    corpo = `<line class="meta" x1="${padL}" y1="${yMeta.toFixed(1)}" x2="${W - padR}" y2="${yMeta.toFixed(1)}"/>
      <text class="asse q" x="${W - padR}" y="${(yMeta - 5).toFixed(1)}" text-anchor="end">obiettivo ${nv(A.meta)}</text>
      <polygon class="area-reale" points="${area}"/>
      <polyline class="linea-piano" points="${pPiano}"/>
      <polyline class="linea-reale" points="${pReale}"/>
      <circle class="punto" cx="${xc(reali.length - 1).toFixed(1)}" cy="${y(ultimo.cum).toFixed(1)}" r="3.4"/>
      ${vis.length > reali.length ? `<line class="oggi-v" x1="${xc(reali.length - 1).toFixed(1)}" y1="${padT}" x2="${xc(reali.length - 1).toFixed(1)}" y2="${base}"/>
        <text class="asse" x="${(xc(reali.length - 1) + 5).toFixed(1)}" y="${padT + 24}">oggi · ${dm(A.oggi)}</text>` : ''}
      <line class="base" x1="${padL}" y1="${base}" x2="${W - padR}" y2="${base}"/>
      <text class="asse" x="${padL - 8}" y="${base + 3}" text-anchor="end">0</text>
      <text class="asse" x="${padL - 8}" y="${(yMeta + 3).toFixed(1)}" text-anchor="end">${nv(A.meta)}</text>
      <text class="asse" x="${padL}" y="${H - 5}">${dm(vis[0].data)}</text>
      <text class="asse" x="${W - padR}" y="${H - 5}" text-anchor="end">${dm(vis[n - 1].data)}</text>
      ${hover}`;

    const attesi = Math.round(ultimo.piano);
    const scarto = ultimo.cum - attesi;
    riga = `oggi sei a <b>${nv(ultimo.cum)}</b> versetti · il piano ne vuole <b>${nv(attesi)}</b> · <b class="${scarto >= 0 ? 'ok' : 'late'}">${scarto >= 0 ? '+' : ''}${nv(scarto)}</b>`;
    legenda = `<span><i class="linea"></i>quello che hai fatto</span><span><i class="linea attesa"></i>linea del piano</span>`;
  }

  return `<div class="mz-graf">
    <div class="mz-graf-h">
      <div class="mz-graf-t">Andamento <span class="mz-graf-sub">${riga}</span></div>
      <div class="mz-graf-tabs">${tabs}</div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento della memorizzazione">${corpo}</svg>
    <div class="mz-graf-f"><div class="mz-graf-leg">${legenda}</div><div class="mz-graf-range">${range}</div></div>
  </div>`;
}

/* il form "nuovo piano": vive da solo così serve sia la pagina vuota
   sia il "＋ nuovo piano in parallelo" quando altri piani corrono già */
function mzFormHtml() {
  if (!mzDraft.fine) mzDraft.fine = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const U = store.unitaMem, u = U[mzDraft.tipo] || U.corano;
  const arg = u.selezione ? mzDraft.sure : mzDraft.n;
  const ayat = store.ayatObiettivo(mzDraft.tipo, arg);
  const gg = Math.max(1, Math.round((new Date(mzDraft.fine + 'T12:00:00') - new Date(store.today() + 'T12:00:00')) / 86400000) + 1);
  const alGiorno = Math.ceil(ayat / gg);
  return `<div class="kh-active">
    <div class="kh-lab">Nuovo piano</div>
    <div class="kh-pos">Scegli cosa memorizzare e in quanto tempo. Il resto lo calcolo io.</div>

    <div class="mz-lab">Cosa</div>
    <div class="chips">${Object.entries(U).map(([k, v]) =>
    `<span class="chip ${mzDraft.tipo === k ? 'sel' : ''}" onclick="mzSetTipo('${k}')">${esc(v.l)}</span>`).join('')}
      ${!u.fisso && !u.selezione ? `<input class="mz-n" type="number" min="1" value="${mzDraft.n}" onchange="mzSetN(this.value)" oninput="mzSetN(this.value)">` : ''}
    </div>
    ${u.selezione ? `
      <div class="sure-sel">
        ${mzDraft.sure.map(num => `<span class="chip sel" onclick="mzTogliSura(${num})">${esc(store.nomeSura(num))} · ${store.vvSura(num)} vv ✕</span>`).join('')}
        <select class="mz-sura-add" onchange="mzAggiungiSura(this.value);this.value=''">
          <option value="">＋ scegli una sura…</option>
          ${store.sureTutte().filter(s => !mzDraft.sure.includes(s.numero))
      .map(s => `<option value="${s.numero}">${s.numero} · ${esc(s.nome)} · ${s.vv} vv</option>`).join('')}
        </select>
      </div>` : ''}

    <div class="mz-lab">In quanto tempo</div>
    <div class="chips">${[[365, 'un anno'], [730, 'due anni'], [1095, 'tre anni'], [90, 'tre mesi']].map(([g, l]) =>
    `<span class="chip" onclick="mzSetGiorni(${g})">${l}</span>`).join('')}</div>
    <div class="kh-start"><label>Entro il</label>
      <input type="date" id="mz-fine" value="${esc(mzDraft.fine)}" onchange="mzSetFine(this.value)"></div>

    <div class="mz-preview">
      <b>${esc(store.labelObiettivo(mzDraft.tipo, arg))}</b> in <b>${gg}</b> giorni
      <span class="mz-rate">${alGiorno} ${alGiorno === 1 ? 'versetto' : 'versetti'} al giorno</span>
    </div>
    <button class="kh-b start" onclick="avviaPianoMem()">▶ Inizia</button>
  </div>`;
}

/* etichetta stabile anche a distanza di tempo (quella live di 'corano' deriva) */
function mzLabelPiano(p) {
  return p.obiettivo_tipo === 'corano' ? 'Tutto il Corano'
    : store.labelObiettivo(p.obiettivo_tipo || 'corano', p.obiettivo_n);
}

/* sospesi e completati: la storia dei piani, sempre visibile in fondo */
function mzStoricoHtml() {
  let h = '';
  const sosp = store.pianiMemSospesi();
  if (sosp.length) {
    h += `<div class="hd">Sospesi</div>` + sosp.map(p => {
      const pr = store.progressoPiano(p);
      return `<div class="att-row">
        <div class="ar-b"><div class="ar-n">${esc(mzLabelPiano(p))}</div>
        <div class="ar-m">iniziato il ${esc(p.inizio)} · ${Math.max(0, pr.adesso - pr.startVal)} di ${Math.max(1, pr.meta - pr.startVal)} fatti — lo studiato resta tuo</div></div>
        <button class="kh-b start" onclick="store.resumePianoMem('${p.id}');renderMemorizzazione();toast('Piano ripreso da dove era')">▶ Riprendi</button>
        <button class="tb no" onclick="if(confirm('Eliminare questo piano? I versetti memorizzati restano.')){store.delPianoMem('${p.id}');renderMemorizzazione()}">✕</button>
      </div>`;
    }).join('');
  }
  const fatti = store.pianiMemCompletati();
  if (fatti.length) {
    h += `<div class="hd">Completati <span class="hd-c">${fatti.length}</span></div>` + fatti.map(p => {
      const D = store.durataPianoMem(p);
      const vs = !D || D.vsPiano === null ? ''
        : D.vsPiano > 0 ? `<span class="kc-ok">${D.vsPiano} giorni in anticipo</span>`
          : D.vsPiano === 0 ? `<span class="kc-ok">proprio in tempo</span>`
            : `<span class="kc-late">${-D.vsPiano} giorni oltre</span>`;
      return `<div class="att-row kc">
        <div class="kc-seal">✓</div>
        <div class="ar-b"><div class="ar-n">${esc(mzLabelPiano(p))}</div>
        <div class="ar-m">${esc(p.inizio)} → ${esc(p.completato_il || '')}${D ? ` · <b>${D.giorni} giorni</b> · ${D.ritmo} versetti al giorno` : ''} ${vs}</div></div>
      </div>`;
    }).join('');
  }
  return h;
}

function mzScegliPiano(id) { if (mzGraf.piano !== id) { mzGraf.piano = id; renderMemorizzazione(); } }
function mzNuovoForm() { mzDraft.aperto = !mzDraft.aperto; renderMemorizzazione(); }

function renderMemorizzazione() {
  const st = store.studio();
  /* i piani arrivati in fondo si chiudono da soli, con festa */
  store.controllaPianiMem().forEach(p =>
    toast('🎉 Piano completato — ' + mzLabelPiano(p)));
  const S = store.statMem();
  const piani = S.piani;
  const P = piani.find(x => String(x.id) === String(mzGraf.piano)) || piani[0] || null;
  const [ps, pe] = ottavaPages(st.hizb, st.ottava);

  let html = dayHeader('Memorizzazione');

  if (!P) {
    /* --- nessun piano in corso: si sceglie COSA e IN QUANTO TEMPO --- */
    html += `<div class="khatam-panel"><div class="kh-row">
      <div class="kh-count"><div class="n">${S.pctCorano}%</div><div class="l">memorizzato<br>del Corano</div></div>
      ${mzFormHtml()}
    </div></div>`;
    html += mzStoricoHtml();
    $('#p-memorizzazione').innerHTML = html;
    return;
  }

  /* --- piani in corso (anche più d'uno): un blocco per ciascuno.
         Col piano selezionato si leggono grafico, statistiche e testo. --- */
  const avanti = P.scarto >= 0;
  html += `<div class="khatam-panel"><div class="kh-row">
    <div class="kh-count"><div class="n">${S.pctCorano}%</div><div class="l">memorizzato<br>del Corano</div></div>
    <div class="kh-col">` + piani.map(p => {
    const sel = piani.length > 1 && p === P;
    return `<div class="kh-active mz-piano ${sel ? 'sel' : ''}" ${piani.length > 1 ? `onclick="mzScegliPiano('${p.id}')"` : ''}>
      <div class="kh-lab">Piano in corso · giorno ${p.giorno} di ${p.totGiorni}${sel ? ' · selezionato' : ''}</div>
      <div class="kh-pos"><b>${esc(p.obiettivoLabel)}</b><br>
        ${p.alGiorno} al giorno per finire entro il ${esc(p.fine)}${p.giorniRimasti ? ` · ${p.giorniRimasti} giorni rimasti` : ''}
        <span class="mz-done">${p.fatteObiettivo} di ${p.obiettivo} fatti</span></div>
      <div class="prog prog2"><i class="reale" style="width:${Math.min(100, p.pctObiettivo)}%"></i>
        <span class="tacca" style="left:${Math.min(100, p.pctTempo)}%" title="dove dovresti essere"></span></div>
      <div class="kh-btns">
        <button class="kh-b stop" onclick="event.stopPropagation();store.stopPianoMem('${p.id}');renderMemorizzazione();toast('Piano sospeso — lo studiato resta')">⏸ Sospendi</button>
        <button class="kh-b del" onclick="event.stopPropagation();if(confirm('Eliminare il piano? I versetti memorizzati restano.')){store.delPianoMem('${p.id}');renderMemorizzazione()}">🗑 Elimina</button>
      </div>
    </div>`;
  }).join('') + `
      <button class="kh-b mz-nuovo" onclick="mzNuovoForm()">${mzDraft.aperto ? '✕ Chiudi' : '＋ Nuovo piano in parallelo'}</button>
    </div></div></div>`;

  if (mzDraft.aperto) html += `<div class="khatam-panel"><div class="kh-row">${mzFormHtml()}</div></div>`;

  html += mzChart(P);

  /* --- analisi statistica --- */
  html += `<div class="stat-grid">
    <div class="stat"><div class="s-n">${S.tot.toLocaleString('it')}</div><div class="s-l">versetti memorizzati</div></div>
    <div class="stat ${S.oggi ? 'ok' : ''}"><div class="s-n">${S.oggi}</div><div class="s-l">oggi · te ne restano ${P.restanoOggi}</div></div>
    <div class="stat"><div class="s-n">${P.ritmoReale}</div><div class="s-l">ritmo reale al giorno<br><span class="s-sub">il piano ne chiede ${P.alGiorno}</span></div></div>
    <div class="stat ${avanti ? 'ok' : 'late'}"><div class="s-n">${avanti ? '+' : ''}${P.scarto}</div><div class="s-l">${avanti ? 'avanti sul piano' : 'indietro sul piano'}</div></div>
  </div>`;
  if (P.stimaFine) {
    const inTempo = P.stimaFine <= P.fine;
    html += `<div class="stima ${inTempo ? 'ok' : 'late'}">A questo ritmo finiresti il <b>${esc(P.stimaFine)}</b> — ${inTempo
      ? 'in anticipo sul tuo obiettivo.' : `oltre il ${esc(P.fine)} che ti eri dato.`}</div>`;
  }
  if (P.scaduto) html += `<div class="pi-warn">Il periodo che ti eri dato è finito. Il conto dei versetti resta: puoi continuare o aprire un piano nuovo.</div>`;

  /* --- cosa studiare: se il piano è su sure scelte, comandano quelle --- */
  const sureDelPiano = (P.obiettivo_tipo === 'sura' && Array.isArray(P.obiettivo_n)) ? P.obiettivo_n : null;
  const suraTarget = sureDelPiano ? (st.sura && sureDelPiano.includes(st.sura) ? st.sura : sureDelPiano[0]) : null;

  html += `<div class="mz-filter"><div class="mz-filter-t">Cosa vuoi studiare oggi</div>`;
  if (sureDelPiano) {
    html += `<div class="chips">${sureDelPiano.map(n => {
      const fatti = mzFattiInSura(n);
      return `<span class="chip ${n === suraTarget ? 'sel' : ''}" onclick="store.setStudio({sura:${n}});renderMemorizzazione()">
        ${esc(store.nomeSura(n))} <span class="ch-n">${fatti}/${store.vvSura(n)}</span></span>`;
    }).join('')}</div>`;
  } else {
    html += `<div class="mz-controls">
      <label>Ḥizb <select onchange="store.setStudio({hizb:+this.value});renderMemorizzazione()">${mzSeq(60).map(i => `<option value="${i}" ${st.hizb === i ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      <label>Rubʿ <select onchange="store.setStudio({rubu:+this.value});renderMemorizzazione()">${mzSeq(4).map(i => `<option value="${i}" ${(st.rubu || 1) === i ? 'selected' : ''}>${i}/4</option>`).join('')}</select></label>
      <span class="mz-range">≈ pagine ${ps}–${pe} del muṣḥaf</span>
    </div>`;
  }
  html += `</div>`;

  /* --- il testo giusto dev'essere caricato prima di disegnarlo --- */
  if (suraTarget && store.suraInFinestra() !== suraTarget) {
    $('#p-memorizzazione').innerHTML = html + `<div class="empty">Carico ${esc(store.nomeSura(suraTarget))}…</div>`;
    if (mzCarico !== suraTarget) {           /* guardia: mai due caricamenti uguali di fila */
      mzCarico = suraTarget;
      store.caricaAyat({ sura: suraTarget }).then(() => renderMemorizzazione());
    }
    return;
  }

  const mzModo = store.getSettings().vista.memorizzatore || 'pagina';
  const testa = suraTarget
    ? `${store.nomeSura(suraTarget)} · sura ${suraTarget} <span class="mz-note">${store.vvSura(suraTarget)} versetti</span>`
    : `Ḥizb ${st.hizb} · Rubʿ ${st.rubu || 1}/4 <span class="mz-note">il filtro per ḥizb userà i dati reali del muṣḥaf</span>`;
  html += `<div class="mz-page-head">${testa}</div>`;
  html += `<div class="lettore-tab">
    <span class="chip ${mzModo === 'pagina' ? 'sel' : ''}" onclick="setMemVista('pagina')">📖 Pagina</span>
    <span class="chip ${mzModo === 'lista' ? 'sel' : ''}" onclick="setMemVista('lista')">☰ Versetti</span>
    ${tajChip('renderMemorizzazione()')}
  </div>` + tajLegenda();
  html += recUiHtml();   /* la voce di Ḥuṣarī sul passo caricato */

  if (mzModo === 'pagina') {
    html += renderMushaf({ modo: 'memoria' });
  } else {
    /* stesse righe della Lettura (numero, arabo, traduzione): la checklist
       non piaceva. I comandi stanno di fianco: vai all'aya, evidenzia,
       ✓ memorizzata (resta salvata), ▶ ascolta. */
    const righe = store.list('ayat_demo');
    const nMem = righe.filter(v => store.isMem(v.sura_id, v.aya)).length;
    html += `<div class="mem-conta">${nMem} di ${righe.length} versetti memorizzati qui · la ✓ resta segnata</div>`;
    let lastSura = null;
    html += righe.map(v => {
      const s = suraOf(v.sura_id);
      const isM = store.isMem(v.sura_id, v.aya);
      const isHl = store.isHl(v.sura_id, v.aya);
      let sep = '';
      if (v.sura_id !== lastSura) {
        lastSura = v.sura_id;
        sep = `<div class="sura-sep">Sura ${s.numero} · ${s.translit} · ${s.nome_arabo}</div>`;
      }
      return sep + `<div class="aya-row ${isM ? 'mem' : ''}${isHl ? ' hl' : ''}${Rec.on && Rec.id === v.id ? ' leggendo' : ''}" data-idx="${v.id}">
        <div class="num">${v.aya}</div>
        <div class="tx"><div class="arq">${arTaj(v)}</div><div class="itq">${esc(v.it || '')}</div></div>
        <div class="act">
          <button class="ab go-aya mz-go" title="Vai all'aya — la sua scheda con contesto e pensieri" onclick="apriAya(${v.sura_id},${v.aya})">⋯</button>
          <button class="ab hlb ${isHl ? 'on' : ''}" aria-pressed="${isHl}" title="${isHl ? 'Togli evidenziazione' : 'Evidenzia'}" onclick="store.toggleHl(${v.sura_id},${v.aya});renderMemorizzazione()">🖊</button>
          <button class="ab mzk ${isM ? 'on' : ''}" aria-pressed="${isM}" title="${isM ? 'Memorizzata — tocca per togliere' : 'Segna come memorizzata'}" onclick="store.toggleMem(${v.sura_id},${v.aya});renderMemorizzazione()">✓</button>
          <button class="ab" title="Ascolta da qui (Ḥuṣarī)" onclick="recPlay(${v.id})">▶</button>
        </div></div>`;
    }).join('');
  }

  html += mzStoricoHtml();
  $('#p-memorizzazione').innerHTML = html;
}

/* ============================================================
   PENSIERI
   ============================================================ */
/* i tipi a cui un pensiero si può ancorare: icona, tabella, come si legge, dove porta */
const ANCORE = {
  versetto:    { ico: '📖', l: 'Versetto',    t: 'versetti',   txt: v => { const s = suraOf(v.sura_id); return `${s ? s.translit + ' ' : ''}${s ? s.numero : ''}:${v.numero}`; }, go: id => `openDetail('versetto','${id}')` },
  sura:        { ico: '🕋', l: 'Sura',        t: 'sure',       txt: s => `Sura ${s.numero} · ${s.translit}`, go: () => `nav('quran')` },
  hadith:      { ico: '🟢', l: 'Hadith',      t: 'hadith',     txt: h => h.titolo || h.numero_rif || h.raccolta, go: id => `openDetail('hadith','${id}')` },
  personaggio: { ico: '👤', l: 'Personaggio', t: 'personaggi', txt: p => p.titolo,   go: id => `openDetail('personaggio','${id}')` },
  tema:        { ico: '🧵', l: 'Tema',        t: 'temi',       txt: x => x.titolo, go: id => `openDetail('tema','${id}')` },
  fiqh:        { ico: '📗', l: 'Fiqh',        t: 'fiqh',       txt: x => x.titolo, go: id => `openDetail('fiqh','${id}')` },
  segno_ora:   { ico: '⏳', l: "Segno dell'Ora", t: 'segni_ora', txt: x => x.titolo, go: id => `openDetail('segno_ora','${id}')` },
  creazione:   { ico: '🌌', l: 'Creazione',   t: 'creazione',  txt: x => x.titolo, go: id => `openDetail('creazione','${id}')` },
  luogo:       { ico: '🕌', l: 'Luogo',       t: 'luoghi',     txt: x => x.titolo, go: id => `openDetail('luogo','${id}')` },
  storia:      { ico: '🏜️', l: 'Storia',      t: 'storie',     txt: x => x.titolo, go: id => `openDetail('storia','${id}')` },
  azione:      { ico: '⚖️', l: 'Azione',      t: 'azioni',     txt: x => x.titolo, go: id => `openStudioDetail('azioni','${id}')` },
  asma:        { ico: 'ﷲ',  l: 'Nome di Allah', t: 'asma',    txt: x => `${x.translit} · ${x.significato}`, go: id => `openAsmaDetail('${id}')` },
};

/* Con che id si tiene in mano una riga: sure e Nomi si cercano per numero
   (è così che `store.get` li ritrova), tutto il resto per id. */
const ancoraKey = (k, r) => String(k === 'asma' || k === 'sura' ? r.numero : r.id);

/* Etichetta di un'ancora partendo dal solo id. Per un versetto funziona
   anche se in questo momento non è in memoria: l'id di un'aya È la sua
   posizione nel Corano, quindi sura e numero si ricavano da lì. */
function ancoraTesto(tipo, id) {
  const cfg = ANCORE[tipo]; if (!cfg) return null;
  if (tipo === 'versetto') {
    const rec = store.get('versetti', id);
    if (rec) return String(cfg.txt(rec) || '');
    const p = store._ayaDaIndice(+id);
    return `${store.nomeSura(p.sura)} ${p.sura}:${p.aya}`;
  }
  const rec = store.get(cfg.t, id);
  return rec ? String(cfg.txt(rec) || '') : null;
}

/* Tag e collegamenti di una scheda qualunque, pronti da mostrare.
   Un blocco solo: lo stesso pezzo di pagina serve personaggi, storie, temi. */
function bloccoCollegamenti(tipo, id) {
  const tags = store.tagsDi(id, tipo);
  let h = tags.length ? `<div class="tgs" style="margin:4px 0 18px">${tags.map(t =>
    `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : '';

  const anc = store.ancoreDiCosa(tipo, id)
    .map(a => ({ cfg: ANCORE[a.tipo], tipo: a.tipo, target: a.target, txt: ancoraTesto(a.tipo, a.target) }))
    .filter(a => a.cfg && a.txt);
  h += `<h2>Collegato a</h2>`;
  h += anc.length
    ? `<div class="anchors" style="margin-bottom:6px">${anc.map(a =>
        `<span class="anchor" style="cursor:pointer" onclick="${a.cfg.go(a.target)}">${a.cfg.ico} ${esc(a.txt)}</span>`).join('')}</div>`
    : `<div class="empty" style="padding:12px">Niente ancora. Aprilo in modifica e collegalo a un hadith, a un versetto, a una storia.</div>`;
  return h;
}

/* tutte le ancore di un pensiero, pronte da mostrare */
function anchorLabels(p) {
  const out = store.ancoreDi(p.id).map(a => {
    const cfg = ANCORE[a.tipo]; if (!cfg) return null;
    const t = ancoraTesto(a.tipo, a.target); if (!t) return null;
    return { txt: `${cfg.ico} ${esc(t)}`, onclick: cfg.go(a.target) };
  }).filter(Boolean);
  return out.length ? out : [{ txt: '☀️ nato dalla giornata', onclick: '' }];
}

/* bozza del piano prima dell'avvio: cosa, quanto, entro quando */
let mzDraft = { tipo: 'corano', n: 1, sure: [], fine: '', aperto: false };
function mzSetTipo(t) { mzDraft.tipo = t; renderMemorizzazione(); }
function mzSetN(v) { mzDraft.n = Math.max(1, +v || 1); renderMemorizzazione(); }
function mzSetFine(v) { mzDraft.fine = v; renderMemorizzazione(); }
function mzSetGiorni(g) {
  mzDraft.fine = new Date(Date.now() + g * 86400000).toISOString().slice(0, 10);
  renderMemorizzazione();
}
function mzAggiungiSura(n) {
  n = +n; if (!n || mzDraft.sure.includes(n)) return;
  mzDraft.sure.push(n); mzDraft.sure.sort((a, b) => a - b);
  renderMemorizzazione();
}
function mzTogliSura(n) {
  mzDraft.sure = mzDraft.sure.filter(x => x !== +n);
  renderMemorizzazione();
}
function avviaPianoMem() {
  const fine = mzDraft.fine;
  if (!fine) { toast('Scegli entro quando'); return; }
  if (fine <= store.today()) { toast('La data deve essere nel futuro'); return; }
  const sel = store.unitaMem[mzDraft.tipo] && store.unitaMem[mzDraft.tipo].selezione;
  if (sel && !mzDraft.sure.length) { toast('Scegli almeno una sura'); return; }
  const p = store.newPianoMem(fine, mzDraft.tipo, sel ? mzDraft.sure : mzDraft.n);
  mzDraft = { tipo: 'corano', n: 1, sure: [], fine: '', aperto: false };
  if (p) mzGraf.piano = p.id;               /* il nuovo piano diventa quello selezionato */
  renderMemorizzazione();
  const sp = p && store.statMem().piani.find(x => String(x.id) === String(p.id));
  toast(sp ? `Piano avviato · ${sp.alGiorno} versetti al giorno` : 'Piano avviato');
}

/* ============================================================
   RECITAZIONE (Ḥuṣarī) — la voce della ḥifẓ: un'āya alla volta,
   ripetuta N volte, avanti sul passo caricato, in loop se serve.
   L'id dell'aya è direttamente il nome del file audio.
   ============================================================ */
const Rec = { on: false, id: 0, rip: 3, ripFatte: 0, loop: false, audio: null, riserva: false };
function recAudio() {
  if (!Rec.audio) {
    Rec.audio = new Audio();
    Rec.audio.preload = 'auto';
    Rec.audio.onended = recEnded;
    Rec.audio.onerror = recErrore;
  }
  return Rec.audio;
}
const recIds = () => store.list('ayat_demo').map(v => v.id);

function recUiHtml() {
  const p = Rec.id ? store._ayaDaIndice(Rec.id) : null;
  return `<div class="rec-bar" id="rec-ui">
    <button class="rb-b" title="Versetto precedente" onclick="recSalta(-1)">⏮</button>
    <button class="rb-b play ${Rec.on ? 'on' : ''}" title="${Rec.on ? 'Pausa' : 'Ascolta il passo (Ḥuṣarī)'}" onclick="recToggle()">${Rec.on ? '⏸' : '▶'}</button>
    <button class="rb-b" title="Versetto successivo" onclick="recSalta(1)">⏭</button>
    <span class="rb-rip" title="Quante volte ripetere ogni versetto">${[1, 3, 5, 10].map(n =>
      `<span class="chip ${Rec.rip === n ? 'sel' : ''}" onclick="recSetRip(${n})">×${n}</span>`).join('')}</span>
    <button class="rb-b loop ${Rec.loop ? 'on' : ''}" title="Finito il passo, ricomincia da capo" onclick="recSetLoop()">🔁</button>
    <span class="rb-pos">${p ? esc(store.fmtPos(p)) + (Rec.rip > 1 ? ` · ${Math.min(Rec.ripFatte + 1, Rec.rip)}/${Rec.rip}` : '') : 'Ḥuṣarī · ▶ per ascoltare'}</span>
  </div>`;
}
function aggiornaRecUi() {
  const el = document.getElementById('rec-ui');
  if (el) el.outerHTML = recUiHtml();
  document.querySelectorAll('#p-memorizzazione .leggendo').forEach(x => x.classList.remove('leggendo'));
  if (Rec.id) {
    const r = document.querySelector(`#p-memorizzazione [data-idx="${Rec.id}"]`);
    if (r) { r.classList.add('leggendo'); if (Rec.on) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
}
function recToggle() {
  if (Rec.on) { Rec.on = false; recAudio().pause(); aggiornaRecUi(); return; }
  plPausa();                                    /* una voce alla volta */
  const a = recAudio();
  if (Rec.id && a.src && a.currentTime > 0 && !a.ended) {   /* riprende a metà āya */
    Rec.on = true; a.play().catch(() => recStop('Audio non disponibile')); aggiornaRecUi(); return;
  }
  recPlay(Rec.id || 0);
}
function recPlay(id) {
  plPausa();                                    /* una voce alla volta */
  const ids = recIds();
  if (!ids.length) { toast('Carica prima un passo da studiare'); return; }
  Rec.id = ids.includes(+id) ? +id : ids[0];
  Rec.on = true; Rec.ripFatte = 0; Rec.riserva = false;
  recCarica();
}
function recCarica() {
  const a = recAudio();
  a.src = Rec.riserva ? store.audioUrlAyaRiserva(Rec.id) : store.audioUrlAya(Rec.id);
  a.play().catch(() => { if (Rec.on) recErrore(); });
  aggiornaRecUi();
}
function recEnded() {
  if (!Rec.on) return;
  Rec.ripFatte++;
  if (Rec.ripFatte < Rec.rip) {                 /* stessa āya, di nuovo: nessuna rete */
    const a = recAudio(); a.currentTime = 0; a.play().catch(() => {});
    aggiornaRecUi(); return;
  }
  Rec.ripFatte = 0;
  const ids = recIds(), i = ids.indexOf(Rec.id);
  if (i < 0) { Rec.id = ids[0]; Rec.riserva = false; recCarica(); return; }  /* il passo è cambiato: riparto dal nuovo */
  if (i + 1 < ids.length) { Rec.id = ids[i + 1]; Rec.riserva = false; recCarica(); }
  else if (Rec.loop) { Rec.id = ids[0]; Rec.riserva = false; recCarica(); }
  else recStop('Fine del passo ۩');
}
function recErrore() {
  if (!Rec.on) return;
  if (!Rec.riserva) { Rec.riserva = true; recCarica(); }   /* stessa voce, CDN di riserva */
  else recStop('Audio non raggiungibile — controlla la connessione');
}
function recStop(msg) {
  Rec.on = false; Rec.ripFatte = 0;
  const a = recAudio(); a.pause(); try { a.currentTime = 0; } catch (e) {}
  aggiornaRecUi();
  if (msg) toast(msg);
}
function recSalta(d) {
  const ids = recIds(); if (!ids.length) return;
  const cur = ids.indexOf(Rec.id);
  const i = Math.max(0, Math.min(ids.length - 1, (cur < 0 ? 0 : cur) + d));
  Rec.id = ids[i]; Rec.ripFatte = 0; Rec.riserva = false;
  Rec.on ? recCarica() : aggiornaRecUi();
}
function recSetRip(n) { Rec.rip = n; Rec.ripFatte = 0; aggiornaRecUi(); }
function recSetLoop() { Rec.loop = !Rec.loop; aggiornaRecUi(); }
/* cambiando pagina la voce si ferma: si riprende da dov'era con ▶ */
function recNavPausa() { if (Rec.on) { Rec.on = false; if (Rec.audio) Rec.audio.pause(); } }

/* ============================================================
   ASCOLTO — il Corano come in un lettore musicale: scegli una
   sura o un intervallo e la voce scorre da sola, āya dopo āya,
   anche a schermo spento (Media Session) e mentre giri per
   l'app (mini-barra). È un motore SEPARATO da Rec: quello serve
   la ḥifẓ (ripetizioni sul passo), questo l'ascolto continuo.
   Stessi file audio: l'id globale 1–6236 è il nome del file.
   ============================================================ */
const Player = {
  on: false, id: 0, da: 0, a: 0, vel: 1, loop: false,
  riserva: false, audio: null, pre: null, testi: {}, salvati: 0,
};
function plAudio() {
  if (!Player.audio) {
    const a = new Audio();
    a.preload = 'auto';
    a.setAttribute('playsinline', '');
    a.onended = plEnded;
    a.onerror = plErrore;
    Player.audio = a;
  }
  return Player.audio;
}
/* stato salvato → Player, la prima volta che serve */
function plRipristina() {
  if (Player.da) return;
  const c = (store.getSettings().audio || {}).ascolto || {};
  Player.da = Math.max(1, +c.da || 1);
  Player.a = Math.min(fineCoranoIdx(), Math.max(Player.da, +c.a || store._ayaIndex(1, 7)));
  Player.id = Math.max(Player.da, Math.min(Player.a, +c.id || Player.da));
  Player.vel = +c.vel || 1;
  Player.loop = !!c.loop;
}
function plSalva() {
  store.setSettings({ audio: { ascolto: { da: Player.da, a: Player.a, id: Player.id, vel: Player.vel, loop: Player.loop } } });
}
/* durante il play si salva ogni 10 āyāt, non a ogni file */
function plSalvaOgniTanto() { if (++Player.salvati % 10 === 0) plSalva(); }

function plToggle() {
  plRipristina();
  if (Player.on) { plPausa(); return; }
  recNavPausa();                                /* una voce alla volta */
  const a = plAudio();
  if (Player.id && a.src && a.currentTime > 0 && !a.ended) {   /* riprende a metà āya */
    Player.on = true; a.playbackRate = Player.vel;
    a.play().catch(() => plStop('Audio non disponibile'));
    plStato(); plUi(); return;
  }
  plGioca(Player.id || Player.da);
}
function plGioca(id) {
  plRipristina();
  recNavPausa();
  Player.id = Math.max(Player.da, Math.min(Player.a, +id || Player.da));
  Player.on = true; Player.riserva = false;
  plCarica();
}
function plCarica() {
  const a = plAudio();
  a.src = Player.riserva ? store.audioUrlAyaRiserva(Player.id) : store.audioUrlAya(Player.id);
  a.playbackRate = Player.vel;
  a.play().catch(() => { if (Player.on) plErrore(); });
  if (!Player.riserva && Player.id < Player.a) {   /* scalda la cache per la prossima */
    if (!Player.pre) { Player.pre = new Audio(); Player.pre.preload = 'auto'; }
    Player.pre.src = store.audioUrlAya(Player.id + 1);
  }
  plTesti();
  plMediaSession();
  plUi();
}
function plEnded() {
  if (!Player.on) return;
  if (Player.id < Player.a) { Player.id++; Player.riserva = false; plSalvaOgniTanto(); plCarica(); }
  else if (Player.loop) { Player.id = Player.da; Player.riserva = false; plCarica(); }
  else plStop('Fine dell’ascolto ۩');
}
function plErrore() {
  if (!Player.on) return;
  if (!Player.riserva) { Player.riserva = true; plCarica(); }   /* stessa voce, CDN di riserva */
  else plStop('Audio non raggiungibile — controlla la connessione');
}
function plPausa() {
  if (!Player.on) return;
  Player.on = false;
  if (Player.audio) Player.audio.pause();
  plSalva(); plStato(); plUi();
}
function plStop(msg) {
  Player.on = false;
  if (Player.audio) { Player.audio.pause(); try { Player.audio.currentTime = 0; } catch (e) {} }
  plSalva(); plStato(); plUi();
  if (msg) toast(msg);
}
function plSalta(d) {          /* ±1 āya, dentro il range */
  plRipristina();
  Player.id = Math.max(Player.da, Math.min(Player.a, (Player.id || Player.da) + d));
  Player.riserva = false;
  Player.on ? plCarica() : plUi();
}
function plSaltaSura(d) {      /* come i brani: ⏮ torna all'inizio della sura, ⏭ va alla prossima */
  plRipristina();
  const p = store._ayaDaIndice(Player.id || Player.da);
  let s = p.sura;
  if (d > 0) s = Math.min(114, s + 1);
  else if (p.aya <= 1) s = Math.max(1, s - 1);
  Player.id = Math.max(Player.da, Math.min(Player.a, store.idxDi(s, 1)));
  Player.riserva = false;
  Player.on ? plCarica() : plUi();
}
function plVai(idx) { plGioca(idx); }
function plSetVel(v) {
  Player.vel = +v;
  if (Player.audio) Player.audio.playbackRate = Player.vel;
  plSalva(); plUi();
}
function plSetLoop() { plRipristina(); Player.loop = !Player.loop; plSalva(); plUi(); }

/* una sura intera come un brano: la tocchi e parte */
function plSura(n) {
  n = +n;
  plRipristina();
  Player.da = store.idxDi(n, 1);
  Player.a = store.idxDi(n, store.vvSura(n));
  plGioca(Player.da);
}
function plRangeDalForm() {
  plRipristina();
  const sd = +$('#pl-da-s').value, sa = +$('#pl-a-s').value;
  const ad = Math.max(1, Math.min(store.vvSura(sd), +$('#pl-da-a').value || 1));
  const aa = Math.max(1, Math.min(store.vvSura(sa), +$('#pl-a-a').value || store.vvSura(sa)));
  let i1 = store.idxDi(sd, ad), i2 = store.idxDi(sa, aa);
  if (i2 < i1) { const t = i1; i1 = i2; i2 = t; }
  Player.da = i1; Player.a = i2;
  plGioca(Player.da);
}
/* cambiata la sura "Da": l'āya riparte da 1 e la fine si allinea alla stessa sura */
function plFormDa() {
  const s = +$('#pl-da-s').value, vv = store.vvSura(s);
  $('#pl-da-a').max = vv; $('#pl-da-a').value = 1;
  $('#pl-a-s').value = s;
  $('#pl-a-a').max = vv; $('#pl-a-a').value = vv;
}
function plFormA() {
  const s = +$('#pl-a-s').value, vv = store.vvSura(s);
  $('#pl-a-a').max = vv; $('#pl-a-a').value = vv;
}

/* ---- i testi sotto il player: finestra propria, a blocchi di 20 ---- */
let plTestiRichiesta = 0;
function plTesti() {
  const id = Player.id;
  if (Player.testi[id] && Player.testi[Math.min(id + 8, Player.a)]) return;
  const mia = ++plTestiRichiesta;
  store.testiAyat(id, Math.min(Player.a, id + 20)).then(righe => {
    if (mia !== plTestiRichiesta) return;
    righe.forEach(r => { Player.testi[r.id] = r; });
    plUi();
  }).catch(() => {});
}

/* ---- Media Session: titolo e tasti sulla schermata di blocco ---- */
function plMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    const p = store._ayaDaIndice(Player.id || Player.da);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${store.nomeSura(p.sura)} · ${p.sura}:${p.aya}`,
      artist: 'Maḥmūd Khalīl al-Ḥuṣarī',
      album: 'Addukira · Ascolto',
      artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', () => { if (!Player.on) plToggle(); });
    navigator.mediaSession.setActionHandler('pause', () => plPausa());
    navigator.mediaSession.setActionHandler('previoustrack', () => plSalta(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => plSalta(1));
    plStato();
  } catch (e) { /* browser senza Media Session: pazienza */ }
}
function plStato() {
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = Player.on ? 'playing' : 'paused'; } catch (e) {}
  }
}

/* ---- la pagina ---- */
function renderAscolto() {
  plRipristina();
  let html = dayHeader('Ascolto');
  html += `<p class="sub">La voce di Ḥuṣarī come in un lettore musicale: tocca una sura per farla partire,
    o scegli un intervallo. L'ascolto continua anche nelle altre pagine e a schermo spento.</p>`;
  html += plCardHtml();

  const pDa = store._ayaDaIndice(Player.da), pA = store._ayaDaIndice(Player.a);
  const opzioni = sel => store.sureTutte().map(s =>
    `<option value="${s.numero}" ${s.numero === sel ? 'selected' : ''}>${s.numero} · ${esc(s.nome)}</option>`).join('');
  html += `<div class="pl-form">
    <div class="pl-f"><label>Da</label>
      <select id="pl-da-s" onchange="plFormDa()">${opzioni(pDa.sura)}</select>
      <input id="pl-da-a" type="number" min="1" max="${store.vvSura(pDa.sura)}" value="${pDa.aya}" title="Āya di partenza"></div>
    <div class="pl-f"><label>a</label>
      <select id="pl-a-s" onchange="plFormA()">${opzioni(pA.sura)}</select>
      <input id="pl-a-a" type="number" min="1" max="${store.vvSura(pA.sura)}" value="${pA.aya}" title="Āya finale"></div>
    <button class="add" onclick="plRangeDalForm()">▶ Ascolta l'intervallo</button>
  </div>`;

  const cur = store._ayaDaIndice(Player.id || Player.da).sura;
  html += `<div class="pl-list">` + store.sureTutte().map(s => `
    <div class="pl-row ${s.numero === cur ? 'playing' : ''}" data-sura="${s.numero}" onclick="plSura(${s.numero})">
      <span class="pl-n">${s.numero}</span>
      <span class="pl-nome">${esc(s.nome)}</span>
      <span class="pl-vv">${s.vv} āyāt</span>
      <span class="pl-go">${s.numero === cur && Player.on ? '♪' : '▶'}</span>
    </div>`).join('') + `</div>`;

  $('#p-ascolto').innerHTML = html;
}

function plCardHtml() {
  plRipristina();
  const p = store._ayaDaIndice(Player.id || Player.da);
  const pDa = store._ayaDaIndice(Player.da), pA = store._ayaDaIndice(Player.a);
  const r = Player.testi[Player.id];
  return `<div class="pl-card" id="pl-card">
    <div class="pl-sura">${esc(store.nomeSura(p.sura))} <span class="pl-pos">${p.sura}:${p.aya}</span></div>
    <div class="pl-range-lbl" id="pl-range-lbl">${esc(store.fmtPos(pDa))} → ${esc(store.fmtPos(pA))}
      · āya ${Player.id - Player.da + 1} di ${Player.a - Player.da + 1}</div>
    <input class="pl-seek" type="range" min="${Player.da}" max="${Player.a}" value="${Player.id || Player.da}"
      oninput="plSeekLbl(this.value)" onchange="plVai(+this.value)" aria-label="Posizione nell'intervallo">
    <div class="pl-ctrl">
      <button class="rb-b" title="Inizio sura / sura precedente" onclick="plSaltaSura(-1)">⏮</button>
      <button class="rb-b" title="Āya precedente" onclick="plSalta(-1)">⏪</button>
      <button class="rb-b play ${Player.on ? 'on' : ''}" title="${Player.on ? 'Pausa' : 'Ascolta'}" onclick="plToggle()">${Player.on ? '⏸' : '▶'}</button>
      <button class="rb-b" title="Āya successiva" onclick="plSalta(1)">⏩</button>
      <button class="rb-b" title="Sura successiva" onclick="plSaltaSura(1)">⏭</button>
    </div>
    <div class="pl-opts">
      ${[0.8, 1, 1.25, 1.5, 2].map(v =>
        `<span class="chip ${Player.vel === v ? 'sel' : ''}" onclick="plSetVel(${v})">×${v}</span>`).join('')}
      <button class="rb-b loop ${Player.loop ? 'on' : ''}" title="Finito l'intervallo, ricomincia" onclick="plSetLoop()">🔁</button>
    </div>
    ${r ? `<div class="pl-testo"><div class="pl-ar" dir="rtl">${esc(r.arabo)}</div>
      ${r.it ? `<div class="pl-it">${esc(r.it)}</div>` : ''}</div>` : ''}
  </div>`;
}
/* mentre trascini il cursore: solo l'etichetta, il play parte al rilascio */
function plSeekLbl(v) {
  const el = document.getElementById('pl-range-lbl'); if (!el) return;
  const pDa = store._ayaDaIndice(Player.da), pA = store._ayaDaIndice(Player.a);
  el.textContent = `${store.fmtPos(pDa)} → ${store.fmtPos(pA)} · āya ${+v - Player.da + 1} di ${Player.a - Player.da + 1}`;
}

function plUi() {
  const card = document.getElementById('pl-card');
  if (card) card.outerHTML = plCardHtml();
  const lista = document.querySelector('#p-ascolto .pl-list');
  if (lista) {
    const cur = store._ayaDaIndice(Player.id || Player.da).sura;
    lista.querySelectorAll('.pl-row').forEach(riga => {
      const mia = +riga.dataset.sura === cur;
      riga.classList.toggle('playing', mia);
      riga.querySelector('.pl-go').textContent = mia && Player.on ? '♪' : '▶';
    });
  }
  plMini();
}

/* la mini-barra: vive su body e compare fuori dalla pagina Ascolto */
function plMini() {
  let host = document.getElementById('player-mini-host');
  if (!host) { host = document.createElement('div'); host.id = 'player-mini-host'; document.body.appendChild(host); }
  if (!Player.on || paginaAttiva === 'ascolto') { host.innerHTML = ''; return; }
  const p = store._ayaDaIndice(Player.id || Player.da);
  host.innerHTML = `<div class="pl-mini" onclick="nav('ascolto')" title="Apri l'Ascolto">
    <span class="pm-e">🎧</span><span class="pm-pos">${esc(store.fmtPos(p))}</span>
    <button class="pm-b" title="Pausa" onclick="event.stopPropagation();plPausa()">⏸</button>
  </div>`;
}

/* la data del pensiero: in tabella è `giorno` (YYYY-MM-DD) */
function dataPensiero(p) {
  const g = p.giorno || p.data || '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(g)) return g;
  try { return new Date(g.slice(0, 10) + 'T12:00:00').toLocaleDateString('it', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return g; }
}

/* ---- filtri della pagina: parola, periodo, tag ---- */
let pfQ = '', pfDal = '', pfAl = '', pfTag = [];
const pfAttivi = () => !!(pfQ.trim() || pfDal || pfAl || pfTag.length);

/* Il setaccio. La parola cerca nel testo, nei tag E nelle etichette dei
   collegamenti: così «Kahf» tira fuori anche i pensieri appesi a quella sura. */
function pensieriFiltrati() {
  const q = senzaSegni(pfQ).trim();
  const cercati = pfTag.map(senzaSegni);
  return [...store.list('pensieri')].reverse().filter(p => {
    const g = String(p.giorno || '').slice(0, 10);
    if (pfDal && g && g < pfDal) return false;
    if (pfAl && g && g > pfAl) return false;
    const tags = store.tagsDi(p.id);
    if (cercati.length) {
      const suoi = tags.map(senzaSegni);
      if (!cercati.every(t => suoi.includes(t))) return false;   /* tutti, non uno qualsiasi */
    }
    if (q) {
      const dove = senzaSegni([p.testo, tags.join(' '), anchorLabels(p).map(a => a.txt).join(' ')].join(' '));
      if (!dove.includes(q)) return false;
    }
    return true;
  });
}

function renderPensieri() {
  const tutti = store.tuttiITag();
  let html = head('Il tuo diario', 'Pensieri', 'Ogni pensiero ricorda da dove è nato. Da qui può maturare e migrare nello Studio.');
  html += `<div class="add-pensiero" onclick="openPensieroModal()">＋ Aggiungi un pensiero…</div>`;

  html += `<div class="pf">
    <input class="pf-q" id="pf-q" autocomplete="off" placeholder="🔍 Cerca fra i pensieri, i tag, i collegamenti…"
      value="${esc(pfQ)}" oninput="pfSetQ(this.value)">
    <div class="pf-per">
      <label for="pf-dal">dal</label><input type="date" id="pf-dal" value="${esc(pfDal)}" onchange="pfSetData('dal',this.value)">
      <label for="pf-al">al</label><input type="date" id="pf-al" value="${esc(pfAl)}" onchange="pfSetData('al',this.value)">
    </div>
    <button class="pf-x ${pfAttivi() ? '' : 'off'}" onclick="pfPulisci()">Pulisci</button>
  </div>`;

  html += tutti.length
    ? `<div class="pf-tags">${tutti.map(t =>
        `<span class="chip ${pfTag.includes(t.tag) ? 'sel' : ''}" data-tag="${esc(t.tag)}">#${esc(t.tag)}<span class="ch-n">${t.n}</span></span>`).join('')}</div>`
    : `<div class="pf-tags vuoti">Nessun tag ancora — aggiungine scrivendo o modificando un pensiero.</div>`;

  html += `<div id="pens-lista"></div>`;
  $('#p-pensieri').innerHTML = html;
  renderListaPensieri();
}

/* solo la lista: si ridisegna a ogni tasto senza far perdere il fuoco alla ricerca */
function renderListaPensieri() {
  const box = $('#pens-lista'); if (!box) return;
  const totale = store.list('pensieri').length;
  const list = pensieriFiltrati();
  let html = pfAttivi()
    ? `<div class="pf-conta">${list.length} ${list.length === 1 ? 'pensiero' : 'pensieri'} su ${totale}</div>` : '';
  html += list.map(p => {
    const anc = anchorLabels(p).map(a =>
      `<span class="anchor" ${a.onclick ? `onclick="${a.onclick}" style="cursor:pointer"` : ''}>${a.txt}</span>`).join('');
    const tags = store.tagsDi(p.id).map(t =>
      `<span class="tg ${pfTag.includes(t) ? 'sel' : ''}" data-tag="${esc(t)}" title="Filtra per questo tag">#${esc(t)}</span>`).join('');
    return `<div class="pens"><div class="anchors">${anc}</div>
    <div class="tx">${esc(p.testo)}</div>
    ${tags ? `<div class="tgs">${tags}</div>` : ''}
    <div class="pens-ft">
      <span class="dt">${esc(dataPensiero(p))}</span>
      <span class="acts">
        <button class="tb" title="Modifica il pensiero" onclick="openPensieroEdit('${p.id}')">✎</button>
        <button class="tb no" title="Elimina il pensiero" onclick="eliminaPensiero('${p.id}')">🗑</button>
      </span>
    </div></div>`;
  }).join('') || (totale
    ? `<div class="empty">Nessun pensiero con questi filtri.</div>`
    : `<div class="empty">Ancora nessun pensiero — scrivine uno qui sopra.</div>`);
  box.innerHTML = html;
}

function pfSetQ(v) { pfQ = v; renderListaPensieri(); pfSegnaPulisci(); }
function pfSetData(quale, v) { if (quale === 'dal') pfDal = v; else pfAl = v; renderListaPensieri(); pfSegnaPulisci(); }
function pfSegnaPulisci() { const b = $('.pf-x'); if (b) b.classList.toggle('off', !pfAttivi()); }
function pfPulisci() { pfQ = ''; pfDal = ''; pfAl = ''; pfTag = []; renderPensieri(); }

/* clic su un tag: dalla pulsantiera o da dentro una card, è lo stesso gesto */
function pfTagToggle(t) {
  const i = pfTag.indexOf(t);
  i >= 0 ? pfTag.splice(i, 1) : pfTag.push(t);
  renderPensieri();
}

function eliminaPensiero(id) {
  const p = store.get('pensieri', id);
  if (!p) return;
  if (!confirm('Eliminare questo pensiero? Spariscono anche i suoi collegamenti.')) return;
  store.delPensiero(id);
  counts(); renderPensieri();
  toast('Pensiero eliminato');
}

/* ---- modale pensiero: serve sia per scriverne uno nuovo sia per correggerlo ---- */
/* id del pensiero in modifica — null quando se ne sta scrivendo uno nuovo */
let ptEditId = null;
const PT_VUOTO = 'Nessun collegamento: il pensiero resterà «nato dalla giornata».';

function ptModalMode(titolo, bottone) {
  const h = $('#pt-titolo'), b = $('#pt-save');
  if (h) h.textContent = titolo;
  if (b) b.textContent = bottone;
}

function openPensieroModal(preset) {
  ptEditId = null;
  $('#pt-testo').value = '';
  linkBoxInit('pt', preset ? [{ tipo: preset.tipo, id: preset.id }] : [], { vuoto: PT_VUOTO });
  tagBoxInit('pt', []);
  ptModalMode('Aggiungi un pensiero', 'Salva pensiero');
  $('#veil-pensiero').classList.add('on');
}

/* stesso modale, riempito con quello che c'è già */
function openPensieroEdit(id) {
  const p = store.get('pensieri', id);
  if (!p) { toast('Pensiero non trovato'); return; }
  ptEditId = p.id;
  $('#pt-testo').value = p.testo || '';
  linkBoxInit('pt', store.ancoreDi(p.id).map(a => ({ tipo: a.tipo, id: a.target })), { vuoto: PT_VUOTO });
  tagBoxInit('pt', store.tagsDi(p.id));
  ptModalMode('Modifica il pensiero', 'Salva le modifiche');
  $('#veil-pensiero').classList.add('on');
}

function closePensieroModal() {
  $('#veil-pensiero').classList.remove('on');
  ptEditId = null;
  linkBoxInit('pt', [], { vuoto: PT_VUOTO });
  tagBoxInit('pt', []);
}

/* ---- i tag dentro il modale ---- */
/* ============================================================
   CASELLA DEI TAG — una sola implementazione, riusabile.
   Ogni modale che ne vuole una dichiara un prefisso: il blocco HTML
   ha `data-tagbox="<pre>"` e dentro gli id `<pre>-tag-in`,
   `<pre>-tag-sugg`, `<pre>-tags`. I tag scelti vivono in TAGBOX[pre].
   ============================================================ */
const TAGBOX = {};
/* su quale elenco pesca ogni casella: le cadenze non si mescolano ai tag */
const TAGBOX_TIPO = { pt: 'tag', m: 'tag', mc: 'cadenza' };
const tagBoxQuale = pre => TAGBOX_TIPO[pre] || 'tag';

function tagBoxInit(pre, tags) {
  TAGBOX[pre] = (tags || []).slice();
  const i = $('#' + pre + '-tag-in'); if (i) i.value = '';
  const s = $('#' + pre + '-tag-sugg'); if (s) s.innerHTML = '';
  tagBoxRender(pre);
}

function tagBoxRender(pre) {
  const box = $('#' + pre + '-tags'); if (!box) return;
  const seg = tagBoxQuale(pre) === 'cadenza' ? '⏱ ' : '#';
  box.innerHTML = (TAGBOX[pre] || []).map(t =>
    `<span class="chip sel">${seg}${esc(t)}<button class="pick-x" data-tagx="${esc(t)}" title="Togli">✕</button></span>`).join('');
}

function tagBoxAdd(pre, t) {
  const v = String(t || '').trim().replace(/^#/, '');
  if (!v) return;
  TAGBOX[pre] = TAGBOX[pre] || [];
  /* stesso tag scritto diverso resta lo stesso tag: si tiene la forma già in uso */
  const esistente = store.tuttiITag(tagBoxQuale(pre)).find(x => senzaSegni(x.tag) === senzaSegni(v));
  const finale = esistente ? esistente.tag : v;
  if (!TAGBOX[pre].some(x => senzaSegni(x) === senzaSegni(finale))) TAGBOX[pre].push(finale);
  const i = $('#' + pre + '-tag-in'); if (i) i.value = '';
  const s = $('#' + pre + '-tag-sugg'); if (s) s.innerHTML = '';
  tagBoxRender(pre);
}

function tagBoxDel(pre, t) {
  TAGBOX[pre] = (TAGBOX[pre] || []).filter(x => x !== t);
  tagBoxRender(pre);
}

/* suggerisce i tag che usi già, per non moltiplicare le varianti */
function tagBoxSugg(pre) {
  const el = $('#' + pre + '-tag-in'), box = $('#' + pre + '-tag-sugg');
  if (!el || !box) return;
  const q = senzaSegni(el.value).trim();
  if (!q) { box.innerHTML = ''; return; }
  const scelti = TAGBOX[pre] || [];
  const hit = store.tuttiITag(tagBoxQuale(pre))
    .filter(x => senzaSegni(x.tag).includes(q) && !scelti.some(y => senzaSegni(y) === senzaSegni(x.tag)))
    .slice(0, 6);
  const seg = tagBoxQuale(pre) === 'cadenza' ? '⏱ ' : '#';
  box.innerHTML = hit.map(x =>
    `<div class="pick-hit" data-tagadd="${esc(x.tag)}">${seg}${esc(x.tag)} <span class="ch-n">${x.n}</span></div>`).join('');
}

function tagBoxTasti(pre, e) {
  /* Invio prende ciò che hai scritto, non il suggerimento: i suggerimenti
     si prendono cliccandoli, così non ti ritrovi un tag che non volevi */
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    tagBoxAdd(pre, e.target.value);
    return;
  }
  /* cancellando a campo vuoto si toglie l'ultimo tag, come nelle caselle mail */
  if (e.key === 'Backspace' && !e.target.value && (TAGBOX[pre] || []).length) {
    TAGBOX[pre].pop(); tagBoxRender(pre);
  }
}

/* i tag da salvare, compreso quello scritto e non ancora confermato con Invio */
function tagBoxValori(pre) {
  const el = $('#' + pre + '-tag-in');
  if (el && el.value.trim()) tagBoxAdd(pre, el.value);
  return (TAGBOX[pre] || []).slice();
}

/* ============================================================
   CASELLA DEI COLLEGAMENTI — una sola implementazione, riusabile.
   Come per i tag: ogni modale dichiara un prefisso e ha i suoi
   contenitori `<pre>-tipi` e `<pre>-quali`. Lo stato vive qui, non
   nel DOM, così ridisegnare non cancella le scelte già fatte.
   ============================================================ */
const LINKBOX = {};

/* `scelte` tiene una LISTA per tipo: in un hadith i personaggi coinvolti
   sono spesso più d'uno — chi lo riporta, chi compare nel racconto. */
function linkBoxInit(pre, ancore, opz) {
  const st = LINKBOX[pre] = { tipi: [], scelte: {}, escludi: (opz && opz.escludi) || [], vuoto: (opz && opz.vuoto) || '' };
  (ancore || []).forEach(a => {
    if (!ANCORE[a.tipo] || st.escludi.includes(a.tipo)) return;
    if (!st.tipi.includes(a.tipo)) st.tipi.push(a.tipo);
    st.scelte[a.tipo] = st.scelte[a.tipo] || [];
    if (!st.scelte[a.tipo].includes(String(a.id))) st.scelte[a.tipo].push(String(a.id));
  });
  linkBoxRender(pre);
}
const linkScelti = (pre, k) => (LINKBOX[pre] && LINKBOX[pre].scelte[k]) || [];

function linkBoxRender(pre) {
  const st = LINKBOX[pre]; if (!st) return;
  const chips = $('#' + pre + '-tipi'), quali = $('#' + pre + '-quali');
  if (!chips || !quali) return;
  chips.innerHTML = Object.entries(ANCORE).filter(([k]) => !st.escludi.includes(k)).map(([k, c]) =>
    `<span class="chip ${st.tipi.includes(k) ? 'sel' : ''}" onclick="linkToggleTipo('${pre}','${k}')">${c.ico} ${esc(c.l)}</span>`).join('');

  quali.innerHTML = st.tipi.map(k => {
    const c = ANCORE[k];
    const n = linkScelti(pre, k).length;
    return `<div class="f"><label>${c.ico} Quale ${esc(c.l.toLowerCase())}${n > 1 ? ` <span class="lbl-hint">${n} scelti</span>` : ''}</label>
      <div class="pick">${linkPickHtml(pre, k)}</div></div>`;
  }).join('') || (st.vuoto ? `<div class="set-info">${st.vuoto}</div>` : '');

  /* i risultati di partenza, senza dover scrivere niente */
  st.tipi.forEach(k => linkCerca(pre, k));
}

function linkToggleTipo(pre, t) {
  const st = LINKBOX[pre]; if (!st) return;
  const i = st.tipi.indexOf(t);
  if (i >= 0) { st.tipi.splice(i, 1); delete st.scelte[t]; } else st.tipi.push(t);
  linkBoxRender(pre);
  /* appena acceso un tipo, il cursore è già nella sua casella di ricerca */
  const el = document.getElementById(pre + '-s-' + t);
  if (el) el.focus();
}

/* cosa suggerire di scrivere, tipo per tipo */
const LINK_HINT = {
  versetto: 'Scrivi il numero: 2:255 — oppure una parola',
  sura:     'Numero o nome della sura: 18, Kahf…',
  asma:     'Numero o nome: 1, ar-Raḥmān…',
};
const linkHint = k => LINK_HINT[k] || 'Scrivi per cercare…';

/* le scelte già fatte, e sotto la ricerca che resta aperta per aggiungerne altre */
function linkPickHtml(pre, k) {
  const scelti = linkScelti(pre, k);
  const pillole = scelti.map(id => `<div class="pick-sel"><span>${esc(ancoraTesto(k, id) || '—')}</span>
    <button class="pick-x" title="Togli questa scelta" onclick="linkPulisci('${pre}','${k}','${esc(String(id))}')">✕</button></div>`).join('');
  const cerca = `<input class="pick-in" id="${pre}-s-${k}" autocomplete="off"
      placeholder="${esc(scelti.length ? 'Aggiungine un altro…' : linkHint(k))}"
      oninput="linkCerca('${pre}','${k}')" onkeydown="linkTasti(event,'${pre}','${k}')">
    <div class="pick-hits" id="${pre}-r-${k}"></div>`;
  return pillole + cerca;
}

function linkCerca(pre, k) {
  const el = document.getElementById(pre + '-s-' + k);
  const box = document.getElementById(pre + '-r-' + k);
  if (!box) return;
  const q = el ? el.value : '';
  if (k === 'versetto' && !q.trim()) {
    box.innerHTML = `<div class="pick-vuoto">Scrivi il numero del versetto — per esempio 2:255</div>`;
    return;
  }
  /* chi è già stato scelto non ricompare fra i risultati */
  const gia = linkScelti(pre, k);
  const res = linkRisultati(k, q).filter(r => !gia.includes(String(r.id)));
  box.innerHTML = res.length
    ? res.map(r => `<div class="pick-hit" onclick="linkScegli('${pre}','${k}','${esc(String(r.id))}')">${esc(r.label)}</div>`).join('')
    : `<div class="pick-vuoto">${gia.length ? 'Nient’altro da aggiungere' : 'Nessun risultato'}</div>`;
}

function linkScegli(pre, k, id) {
  const st = LINKBOX[pre];
  st.scelte[k] = st.scelte[k] || [];
  if (!st.scelte[k].includes(String(id))) st.scelte[k].push(String(id));
  linkBoxRender(pre);
  const el = document.getElementById(pre + '-s-' + k);
  if (el) el.focus();                 /* pronto per il prossimo, senza altri clic */
}

function linkPulisci(pre, k, id) {
  const st = LINKBOX[pre];
  st.scelte[k] = linkScelti(pre, k).filter(x => x !== String(id));
  linkBoxRender(pre);
  const el = document.getElementById(pre + '-s-' + k);
  if (el) el.focus();
}

/* Invio prende il primo risultato: cerchi «2:255», premi Invio, fatto */
function linkTasti(e, pre, k) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const primo = document.querySelector('#' + pre + '-r-' + k + ' .pick-hit');
  if (primo) primo.click();
}

/* i collegamenti da salvare, tutti: un tipo acceso senza scelte non conta */
function linkValori(pre) {
  const st = LINKBOX[pre]; if (!st) return [];
  return st.tipi.flatMap(k => linkScelti(pre, k).map(id => ({ tipo: k, id })));
}

/* Cercare «khamisa» deve trovare «khamīṣa»: i segni sulle vocali e le due
   lettere ʿayn/hamza si tolgono da entrambe le parti prima di confrontare.
   Vale anche per l'arabo, dove leva le vocali brevi. */
const senzaSegni = s => String(s || '').normalize('NFD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670]/g, '')
  .replace(/[\u02bb\u02bc\u02be\u02bf\u2018\u2019']/g, '')
  .toLowerCase();

/* La ricerca. Il numero è la via maestra — le liste sono troppo lunghe
   per scorrerle, e per un versetto il numero si sa sempre a memoria. */
function linkRisultati(k, q) {
  q = senzaSegni(q).trim();
  const c = ANCORE[k];
  const out = [];
  if (k === 'versetto') {
    /* «2:255», «2 255», «2.255» → quel versetto esatto, caricato o no */
    const m = q.match(/^(\d{1,3})\s*[:.\s-]\s*(\d{1,3})$/);
    if (m) {
      const s = +m[1], a = +m[2];
      if (s >= 1 && s <= 114 && a >= 1 && a <= store.vvSura(s))
        out.push({ id: store.idxDi(s, a), label: `${store.nomeSura(s)} ${s}:${a}` });
      return out;
    }
    /* solo il numero della sura → i suoi primi versetti, per scegliere al volo */
    if (/^\d{1,3}$/.test(q)) {
      const s = +q;
      if (s >= 1 && s <= 114)
        for (let a = 1; a <= Math.min(8, store.vvSura(s)); a++)
          out.push({ id: store.idxDi(s, a), label: `${store.nomeSura(s)} ${s}:${a}` });
      return out;
    }
    /* parole: si cercano fra i versetti aperti nel lettore */
    if (q.length >= 2) store.list('versetti').forEach(v => {
      if (out.length >= 8) return;
      if (senzaSegni((v.traduzione || '') + ' ' + (v.arabo || '')).includes(q))
        out.push({ id: v.id, label: String(c.txt(v) || '') });
    });
    return out;
  }
  (store.list(c.t) || []).forEach(r => {
    if (out.length >= 8) return;
    const label = String(c.txt(r) || '');
    const dove = senzaSegni([label, r.numero, r.nome, r.nome_arabo, r.titolo, r.testo,
      r.translit, r.significato, r.raccolta, r.numero_rif].filter(Boolean).join(' '));
    if (!q || dove.includes(q)) out.push({ id: ancoraKey(k, r), label });
  });
  return out;
}

function savePensiero() {
  const txt = $('#pt-testo').value.trim();
  if (!txt) { toast('Scrivi il pensiero'); return; }
  const ancore = linkValori('pt');
  const tags = tagBoxValori('pt');
  if (ptEditId) {
    store.editPensiero(ptEditId, txt, ancore, tags);
    closePensieroModal(); counts(); renderPensieri();
    toast('Pensiero aggiornato ✓');
    return;
  }
  store.addPensiero(txt, ancore, tags);
  closePensieroModal(); counts(); renderPensieri();
  toast(ancore.length > 1 ? `Pensiero salvato · ${ancore.length} collegamenti ✓` : 'Pensiero salvato ✓');
}

/* ============================================================
   STUDIO — card e pagine
   ============================================================ */
const vCard = v => { const s = suraOf(v.sura_id); return `<div class="card" onclick="apriAya(${v.sura_id},${v.aya})"><span class="k">${s ? s.numero + ' · ' + s.translit : ''} : ${v.numero}</span><div class="arh">${esc(v.arabo)}</div><p>${esc(v.traduzione)}</p></div>`; };
/* se l'hadith ha un titolo è quello a fare da intestazione, e sotto va il
   testo: il titolo è il modo in cui te lo richiami, cercarlo altrove è inutile */
const hCard = h => {
  const taglia = (s, n) => esc(String(s || '').slice(0, n)) + (String(s || '').length > n ? '…' : '');
  const tags = store.tagsDi(h.id, 'hadith');
  return `<div class="card" onclick="openDetail('hadith','${h.id}')">
    <span class="k">${esc(h.numero_rif || h.raccolta)}</span>
    <h3>${h.titolo ? esc(h.titolo) : taglia(h.testo, 50)}</h3>
    <p>${h.titolo ? taglia(h.testo, 100) : esc(h.nota || h.isnad)}</p>
    ${tags.length ? `<div class="tgs">${tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="ft"><span class="dot ${h.grado === 'sahih' ? '' : 'h'}">${GRADO[h.grado]}</span></div></div>`;
};
const pCard = p => {
  const tags = store.tagsDi(p.id, 'personaggio');
  return `<div class="card" onclick="openDetail('personaggio','${p.id}')">
    <span class="k">${CAT[p.categoria] || esc(p.categoria || '')}</span>
    <h3>${esc(p.titolo)}</h3>
    ${p.arabo ? `<div class="arh">${esc(p.arabo)}</div>` : ''}
    <p>${esc(p.sommario || p.corpo || '')}</p>
    ${tags.length ? `<div class="tgs">${tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
};
const sCard = s => {
  const tags = store.tagsDi(s.id, 'storia');
  const testo = String(s.corpo || '');
  return `<div class="card" onclick="openDetail('storia','${s.id}')">
    <span class="k">${esc(s.riferimento || 'Racconto')}</span>
    <h3>${esc(s.titolo)}</h3>
    <p>${esc(testo.slice(0, 140))}${testo.length > 140 ? '…' : ''}</p>
    ${tags.length ? `<div class="tgs">${tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
};
const pesoStoria = s => senzaSegni([s.titolo, s.corpo, s.riferimento,
  store.tagsDi(s.id, 'storia').join(' ')].filter(Boolean).join(' '));

/* ---- pagina Storie: aggiungi, cerca, filtra per tag ---- */
let stKw = '', stTag = [];
function stSet(v) { stKw = v; storieSearch(); }
function stTagToggle(t) {
  const i = stTag.indexOf(t);
  i >= 0 ? stTag.splice(i, 1) : stTag.push(t);
  renderStories();
}
function storieClear() { stKw = ''; stTag = []; renderStories(); }

function renderStories() {
  let html = head('Storie · القصص', 'Racconti', 'I grandi racconti, con dentro chi li vive e da dove vengono.');
  html += `<div class="add-voce" onclick="openModalTipo('storia')">＋ Aggiungi una storia…</div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-1">
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="st-kw" placeholder="Titolo, racconto, fonte, tag…" value="${esc(stKw)}" oninput="stSet(this.value)"></div>
      <button class="qs-clear" onclick="storieClear()" title="Azzera">✕</button>
    </div></div>`;

  const conta = new Map();
  store.list('storie').forEach(s => store.tagsDi(s.id, 'storia')
    .forEach(t => conta.set(t, (conta.get(t) || 0) + 1)));
  if (conta.size) html += `<div class="pf-tags">${[...conta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .map(([t, n]) => `<span class="chip ${stTag.includes(t) ? 'sel' : ''}" data-stag="${esc(t)}">#${esc(t)}<span class="ch-n">${n}</span></span>`).join('')}</div>`;

  html += `<div id="st-list"></div>`;
  $('#p-stories').innerHTML = html;
  storieSearch();
}

function storieSearch() {
  const q = senzaSegni(stKw).trim();
  let list = store.list('storie');
  if (q) list = list.filter(s => pesoStoria(s).includes(q));
  if (stTag.length) list = list.filter(s => {
    const suoi = store.tagsDi(s.id, 'storia').map(senzaSegni);
    return stTag.map(senzaSegni).every(t => suoi.includes(t));
  });
  const box = $('#st-list');
  const conta = (q || stTag.length) ? `<div class="qs-count">${list.length} storie</div>` : '';
  box.innerHTML = conta + (list.length
    ? `<div class="grid">${list.map(sCard).join('')}</div>`
    : `<div class="empty">${store.list('storie').length
        ? 'Nessuna storia con questi filtri.' : 'Nessuna storia ancora — aggiungine una qui sopra.'}</div>`);
}
/* ============================================================
   SCHEDE-RACCOLTA — Temi e, per ora, Fiqh.
   Stessa forma: si scrivono una volta (nome + concetto) e poi si
   riempiono da sole, perché sono le altre schede ad agganciarsi a loro.
   ============================================================ */
const RACCOLTA_CFG = {
  tema: { lista: 'temi', box: 'tm', dom: 'p-themes',
    eye: 'Temi · المواضيع', titolo: 'I fili',
    sub: 'Scrivi il tema una volta. Da lì in poi, tutto ciò che lo riguarda si aggancia da solo e resta qui.',
    aggiungi: '＋ Crea un nuovo tema…', cerca: 'Nome del tema o concetto…',
    vuota: 'Nessun tema ancora. Creane uno: ṣabr, matrimonio, sincerità…',
    niente: 'Nessun tema con questa ricerca.' },
  fiqh: { lista: 'fiqh', box: 'fq', dom: 'p-fiqh',
    eye: 'Fiqh · الفقه', titolo: 'Regole e scuole',
    sub: 'Un argomento per volta. Poi ogni hadith, versetto o pensiero che lo riguarda si aggancia qui.',
    aggiungi: '＋ Crea un nuovo argomento…', cerca: 'Argomento o concetto…',
    vuota: 'Nessun argomento ancora. Creane uno: ṭahāra, wuḍūʾ, zakāt…',
    niente: 'Nessun argomento con questa ricerca.' },
  segno_ora: { lista: 'segni_ora', box: 'so', dom: 'p-segni_ora',
    eye: "Segni dell'Ora · علامات الساعة", titolo: "I segni dell'Ora",
    sub: 'Un segno per volta. Poi tutto ciò che lo riguarda — hadith, versetti, pensieri — si raccoglie qui.',
    aggiungi: '＋ Crea un nuovo segno…', cerca: 'Segno o descrizione…',
    vuota: "Nessun segno ancora. Creane uno: il fumo, il sole da occidente, il Dajjāl…",
    niente: 'Nessun segno con questa ricerca.' },
  creazione: { lista: 'creazione', box: 'cr', dom: 'p-creazione',
    eye: 'La creazione · الخلق', titolo: 'La creazione',
    sub: 'Il cosmo, gli esseri, gli ordini del creato. Scrivi la voce, poi si riempie da sola.',
    aggiungi: '＋ Crea una nuova voce…', cerca: 'Voce o descrizione…',
    vuota: 'Nessuna voce ancora. Creane una: gli angeli, il Trono, i sette cieli…',
    niente: 'Nessuna voce con questa ricerca.' },
  luogo: { lista: 'luoghi', box: 'lg', dom: 'p-luoghi',
    eye: 'Luoghi · الأماكن', titolo: 'I luoghi',
    sub: 'Luoghi sacri e dell’aldilà. Scrivi il luogo, poi tutto ciò che vi accade si raccoglie qui.',
    aggiungi: '＋ Crea un nuovo luogo…', cerca: 'Luogo o descrizione…',
    vuota: 'Nessun luogo ancora. Creane uno: la Kaʿba, al-Aqṣā, il Paradiso…',
    niente: 'Nessun luogo con questa ricerca.' },
};

/* quante cose si sono agganciate, nel tempo */
const pesoRaccolta = (tipo, x) => store.ancoreDiCosa(tipo, x.id).filter(a => ANCORE[a.tipo]).length
  + store.pensieriDi(tipo, x.id).length;

function raccoltaCard(tipo, x) {
  const n = pesoRaccolta(tipo, x);
  const d = String(x.corpo || '');
  return `<div class="card" onclick="openDetail('${tipo}','${x.id}')">
    <span class="k">${n ? n + (n === 1 ? ' collegamento' : ' collegamenti') : 'ancora vuoto'}</span>
    <h3>${esc(x.titolo)}</h3>
    <p>${esc(d.slice(0, 150))}${d.length > 150 ? '…' : ''}</p></div>`;
}
const tCard = t => raccoltaCard('tema', t);
const fCard = f => raccoltaCard('fiqh', f);

const raccoltaKw = {};
function raccoltaSet(tipo, v) { raccoltaKw[tipo] = v; raccoltaSearch(tipo); }
function raccoltaClear(tipo) { raccoltaKw[tipo] = ''; renderRaccolta(tipo); }

function renderRaccolta(tipo) {
  const cfg = RACCOLTA_CFG[tipo];
  const kw = raccoltaKw[tipo] || '';
  let html = head(cfg.eye, cfg.titolo, cfg.sub);
  html += `<div class="add-voce" onclick="openModalTipo('${tipo}')">${cfg.aggiungi}</div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-1">
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="${cfg.box}-kw" placeholder="${esc(cfg.cerca)}" value="${esc(kw)}" oninput="raccoltaSet('${tipo}',this.value)"></div>
      <button class="qs-clear" onclick="raccoltaClear('${tipo}')" title="Azzera">✕</button>
    </div></div>
  <div id="${cfg.box}-list"></div>`;
  $('#' + cfg.dom).innerHTML = html;
  raccoltaSearch(tipo);
}

function raccoltaSearch(tipo) {
  const cfg = RACCOLTA_CFG[tipo];
  const q = senzaSegni(raccoltaKw[tipo] || '').trim();
  let list = store.list(cfg.lista);
  if (q) list = list.filter(x => senzaSegni([x.titolo, x.corpo].filter(Boolean).join(' ')).includes(q));
  /* i più pieni davanti: sono quelli su cui stai davvero lavorando */
  list = [...list].sort((a, b) => pesoRaccolta(tipo, b) - pesoRaccolta(tipo, a)
    || String(a.titolo).localeCompare(String(b.titolo), 'it'));
  $('#' + cfg.box + '-list').innerHTML = list.length
    ? `<div class="grid">${list.map(x => raccoltaCard(tipo, x)).join('')}</div>`
    : `<div class="empty">${store.list(cfg.lista).length ? cfg.niente : cfg.vuota}</div>`;
}

/* Il cuore delle schede-raccolta (Temi, Fiqh): tutto ciò che nel tempo si è
   agganciato, raccolto per genere. Non si aggiunge niente da qui — arriva da
   solo, ogni volta che colleghi un hadith, un versetto, un pensiero. */
const RACCOLTA_GRUPPI = ['versetto', 'sura', 'hadith', 'personaggio', 'storia', 'azione', 'asma', 'tema', 'fiqh'];

function bloccoRaccolta(tipo, x) {
  const perTipo = {};
  store.ancoreDiCosa(tipo, x.id).forEach(a => {
    if (!ANCORE[a.tipo] || a.tipo === tipo) return;
    (perTipo[a.tipo] = perTipo[a.tipo] || []).push(a);
  });

  let h = '', totale = 0;
  RACCOLTA_GRUPPI.filter(k => k !== tipo).forEach(k => {
    const c = ANCORE[k];
    const righe = (perTipo[k] || [])
      .map(a => ({ target: a.target, txt: ancoraTesto(k, a.target) }))
      .filter(a => a.txt);
    if (!righe.length) return;
    totale += righe.length;
    h += `<h2>${c.ico} ${c.l} <span class="hd-c">${righe.length}</span></h2>
      <div class="tema-lista">${righe.map(a =>
        `<div class="tema-riga" onclick="${c.go(a.target)}">${esc(a.txt)}</div>`).join('')}</div>`;
  });

  const pens = store.pensieriDi(tipo, x.id);
  if (pens.length) {
    totale += pens.length;
    h += `<h2>💭 Pensieri <span class="hd-c">${pens.length}</span></h2>`;
    h += pens.map(p => `<div class="note-b"><div class="l">${esc(dataPensiero(p))}</div>
      <div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('');
  }

  if (!totale) return `<div class="empty" style="padding:18px">Niente ancora.
    Da qui non si aggiunge: apri un hadith, un versetto o un pensiero e collegalo a «${esc(x.titolo)}» — lo ritroverai qui per sempre.</div>`;
  return `<div class="tema-conto">${totale === 1 ? 'una cosa collegata' : totale + ' cose collegate'} a questa scheda</div>` + h;
}

/* ============================================================
   CORANO — ricerca (sura + n° versetto + parole chiave) e sure
   ============================================================ */
function renderQuran() {
  const suraOpts = '<option value="">Tutte le sure</option>' +
    store.list('sure').map(s => `<option value="${s.id}">${s.numero} · ${esc(s.translit)} · ${esc(s.nome_arabo)}</option>`).join('');

  let html = head('Corano · القرآن', 'Cerca e sfoglia', 'Cerca un versetto per sura e numero, o per parole chiave. Sotto, tutte le sure.');

  html += `<div class="quran-search">
    <div class="qs-grid">
      <div class="qs-field qs-sura"><label>Sura</label>
        <select id="qs-sura" onchange="quranSearch()">${suraOpts}</select></div>
      <div class="qs-field qs-aya"><label>Versetto n°</label>
        <input id="qs-aya" type="number" min="1" placeholder="es. 255" oninput="quranSearch()"></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="qs-kw" placeholder="Nel testo arabo o nella traduzione…" oninput="quranSearch()"></div>
      <button class="qs-clear" onclick="quranClear()" title="Azzera">✕</button>
    </div>
  </div>
  <div id="qs-results"></div>`;

  html += `<div class="hd">Le sure</div><div class="grid">${
    store.list('sure').map(s => `<div class="card" onclick="quranPickSura(${s.id})">
      <span class="k">${s.numero} · ${esc(s.translit)}</span>
      <div class="arh">${esc(s.nome_arabo)}</div>
      <p>${esc(s.titolo_it)} · ${s.n_versetti} vv · ${esc(s.rivelazione)}</p></div>`).join('')
  }</div>`;

  $('#p-quran').innerHTML = html;
}

/* filtra i versetti per sura / numero / parole chiave e mostra i risultati */
/* la ricerca interroga il database: tutti e 6236 i versetti, non solo
   quelli in memoria. Async, con un piccolo ritardo per non partire a ogni tasto. */
let qsTimer = null, qsSeq = 0;
function quranSearch() {
  clearTimeout(qsTimer);
  qsTimer = setTimeout(quranCerca, 260);
}
async function quranCerca() {
  const suraId = $('#qs-sura').value ? +$('#qs-sura').value : null;
  const aya = $('#qs-aya').value ? +$('#qs-aya').value : null;
  const kw = ($('#qs-kw').value || '').trim();
  const box = $('#qs-results');
  if (!box) return;

  if (!suraId && !aya && !kw) { box.innerHTML = ''; return; }

  const mio = ++qsSeq;                       /* scarta le risposte vecchie */
  box.innerHTML = `<div class="empty">Cerco…</div>`;
  const list = await store.cercaAyat({ sura: suraId, numero: aya, testo: kw });
  if (mio !== qsSeq) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty">Nessun versetto trovato.</div>`;
    return;
  }
  box.innerHTML = `<div class="qs-count">${list.length} versett${list.length === 1 ? 'o' : 'i'}${list.length >= 80 ? ' (primi 80)' : ''}</div>
    <div class="grid">${list.map(vCard).join('')}</div>`;
}
function quranPickSura(id) { const s = $('#qs-sura'); if (s) { s.value = id; quranSearch(); window.scrollTo(0, 0); } }
function quranClear() {
  $('#qs-sura').value = ''; $('#qs-aya').value = ''; $('#qs-kw').value = '';
  $('#qs-results').innerHTML = '';
}

/* ============================================================
   PERSONAGGI — ricerca (categoria + parole chiave) e sezioni.
   Muḥammad ﷺ ha un blocco a sé in cima; poi Profeti, Ṣaḥāba,
   Nemici, Angeli, Jinn, Sapienti.
   ============================================================ */
/* blocco speciale del Profeta ﷺ */
function mCard(p) {
  return `<div class="pers-muhammad" onclick="openDetail('personaggio','${p.id}')">
    <div class="pm-seal">ﷺ</div>
    <div class="pm-body">
      <div class="pm-lab">Il Sigillo dei Profeti · خاتم النبيين</div>
      <div class="pm-ar">${esc(p.arabo || 'محمد ﷺ')}</div>
      <h3>${esc(p.titolo)}</h3>
      <p>${esc(p.sommario || p.corpo || '')}</p>
    </div></div>`;
}

/* tutto ciò in cui cercare un personaggio, tag compresi */
const pesoPersonaggio = p => senzaSegni([p.titolo, p.arabo, p.sommario, p.corpo, p.riferimento,
  store.tagsDi(p.id, 'personaggio').join(' ')].filter(Boolean).join(' '));

function renderPeople() {
  const catOpts = '<option value="">Tutte le categorie</option>'
    + `<option value="muhammad" ${peCat === 'muhammad' ? 'selected' : ''}>Il Profeta Muḥammad ﷺ</option>`
    + PERS_SEZIONI.map(s => `<option value="${s.k}" ${peCat === s.k ? 'selected' : ''}>${s.t}</option>`).join('');

  let html = head('Personaggi · الأعلام', 'Cerca e sfoglia', 'Cerca per categoria o parole chiave. In cima il Profeta ﷺ, poi le categorie.');
  html += `<div class="add-voce" onclick="openModalTipo('personaggio')">＋ Aggiungi un personaggio…</div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-2">
      <div class="qs-field"><label>Categoria</label>
        <select id="pe-cat" onchange="peSet('cat',this.value)">${catOpts}</select></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="pe-kw" placeholder="Nome, biografia, tag…" value="${esc(peKw)}" oninput="peSet('kw',this.value)"></div>
      <button class="qs-clear" onclick="peopleClear()" title="Azzera">✕</button>
    </div></div>`;

  /* i tag usati dai personaggi, come pulsanti */
  const conta = new Map();
  store.list('personaggi').forEach(p => store.tagsDi(p.id, 'personaggio')
    .forEach(t => conta.set(t, (conta.get(t) || 0) + 1)));
  if (conta.size) html += `<div class="pf-tags">${[...conta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .map(([t, n]) => `<span class="chip ${peTag.includes(t) ? 'sel' : ''}" data-ptag="${esc(t)}">#${esc(t)}<span class="ch-n">${n}</span></span>`).join('')}</div>`;

  html += `<div id="pe-list"></div>`;
  $('#p-people').innerHTML = html;
  peopleSearch();
}
/* lo stato della ricerca sta qui, non nel DOM: accendendo un tag si ridisegna */
let peCat = '', peKw = '', peTag = [];
function peSet(quale, v) { if (quale === 'cat') peCat = v; else peKw = v; peopleSearch(); }
function peTagToggle(t) {
  const i = peTag.indexOf(t);
  i >= 0 ? peTag.splice(i, 1) : peTag.push(t);
  renderPeople();
}

function peopleSearch() {
  const cat = peCat;
  const kw = senzaSegni(peKw).trim();
  let list = store.list('personaggi');
  if (kw) list = list.filter(p => pesoPersonaggio(p).includes(kw));
  if (peTag.length) list = list.filter(p => {
    const suoi = store.tagsDi(p.id, 'personaggio').map(senzaSegni);
    return peTag.map(senzaSegni).every(t => suoi.includes(t));
  });

  const sez = k => list.filter(p => p.categoria === k);
  let html = '';

  /* Muḥammad ﷺ — in cima */
  if (!cat || cat === 'muhammad') {
    sez('muhammad').forEach(p => { html += mCard(p); });
  }
  /* categorie */
  PERS_SEZIONI.forEach(s => {
    if (cat && cat !== s.k) return;
    const items = sez(s.k);
    if (!items.length) return;
    html += `<div class="hd">${s.ico} ${s.t} <span class="hd-c">${items.length}</span></div>
      <div class="grid">${items.map(pCard).join('')}</div>`;
  });
  /* eventuali categorie non previste (dati vecchi) */
  if (!cat) {
    const known = ['muhammad', ...PERS_SEZIONI.map(s => s.k)];
    const others = list.filter(p => !known.includes(p.categoria));
    if (others.length) html += `<div class="hd">Altri <span class="hd-c">${others.length}</span></div>
      <div class="grid">${others.map(pCard).join('')}</div>`;
  }

  $('#pe-list').innerHTML = html || `<div class="empty">${store.list('personaggi').length
    ? 'Nessun personaggio con questi filtri.' : 'Nessun personaggio ancora — aggiungine uno qui sopra.'}</div>`;
}
function peopleClear() { peCat = ''; peKw = ''; peTag = []; renderPeople(); }

/* ============================================================
   HADITH — ricerca (fonte + parole chiave) e lista
   ============================================================ */
/* «Bukhārī, Muslim e Tirmidhī» sono TRE fonti, non una etichetta sola:
   il filtro deve pescare l'hadith da ognuna delle raccolte che lo riportano */
const fontiDi = h => String(h.raccolta || '').split(/,| e /).map(s => s.trim()).filter(Boolean);

function renderHadith() {
  /* fonti = raccolte effettivamente presenti tra gli hadith inseriti */
  const fonti = [...new Set(store.list('hadith').flatMap(fontiDi))].sort((a, b) => a.localeCompare(b, 'it'));
  const fonteOpts = '<option value="">Tutte le fonti</option>' +
    fonti.map(f => `<option value="${esc(f)}" ${f === hsFonte ? 'selected' : ''}>${esc(f)}</option>`).join('');

  let html = head('Hadith · الحديث', 'Cerca e sfoglia', 'Cerca per fonte (Bukhārī, Muslim, Tirmidhī…) o per parole chiave. Sotto, la lista.');
  html += `<div class="add-voce" onclick="openModalTipo('hadith')">＋ Aggiungi un hadith…</div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-2">
      <div class="qs-field"><label>Fonte</label>
        <select id="hs-fonte" onchange="hsSet('fonte',this.value)">${fonteOpts}</select></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="hs-kw" placeholder="Nel testo, nei tag, nell'isnād…" value="${esc(hsKw)}" oninput="hsSet('kw',this.value)"></div>
      <button class="qs-clear" onclick="hadithClear()" title="Azzera">✕</button>
    </div></div>`;

  /* i tag usati dagli hadith, come pulsanti: sommandoli si restringe */
  const conta = new Map();
  store.list('hadith').forEach(h => store.tagsDi(h.id, 'hadith')
    .forEach(t => conta.set(t, (conta.get(t) || 0) + 1)));
  if (conta.size) html += `<div class="pf-tags">${[...conta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .map(([t, n]) => `<span class="chip ${hsTag.includes(t) ? 'sel' : ''}" data-htag="${esc(t)}">#${esc(t)}<span class="ch-n">${n}</span></span>`).join('')}</div>`;

  html += `<div id="hd-list"></div>`;
  $('#p-hadith').innerHTML = html;
  hadithSearch();                                  /* prima resa: lista completa */
}
/* Lo stato della ricerca vive qui e non nel DOM: accendendo un tag la pagina
   si ridisegna, e fonte e parole chiave devono restare dov'erano. */
let hsTag = [], hsFonte = '', hsKw = '';
function hsSet(quale, v) { if (quale === 'fonte') hsFonte = v; else hsKw = v; hadithSearch(); }
function hsTagToggle(t) {
  const i = hsTag.indexOf(t);
  i >= 0 ? hsTag.splice(i, 1) : hsTag.push(t);
  renderHadith();
}
function hadithSearch() {
  const fonte = hsFonte;
  /* i segni non contano: «khamisa» deve trovare «khamīṣa» */
  const kw = senzaSegni(hsKw).trim();
  let list = store.list('hadith');
  if (fonte) list = list.filter(h => fontiDi(h).includes(fonte));
  if (hsTag.length) list = list.filter(h => {
    const suoi = store.tagsDi(h.id, 'hadith').map(senzaSegni);
    return hsTag.map(senzaSegni).every(t => suoi.includes(t));   /* tutti, non uno qualsiasi */
  });
  if (kw)    list = list.filter(h => senzaSegni([h.titolo, h.testo, h.testo_ar, h.nota, h.isnad, h.numero_rif, h.raccolta,
    store.tagsDi(h.id, 'hadith').join(' ')].filter(Boolean).join(' ')).includes(kw));

  const box = $('#hd-list');
  const count = (fonte || kw || hsTag.length) ? `<div class="qs-count">${list.length} hadith</div>` : '';
  box.innerHTML = count + (list.length
    ? `<div class="grid">${list.map(hCard).join('')}</div>`
    : `<div class="empty">Nessun hadith trovato tra quelli inseriti.</div>`);
}
function hadithClear() { hsTag = []; hsFonte = ''; hsKw = ''; renderHadith(); }
/* dal tag dentro la scheda di un hadith alla lista filtrata su quel tag */
function cercaHadithTag(t) { hsTag = [t]; nav('hadith'); }

/* ============================================================
   SCHEDE DI STUDIO GENERICHE — Azioni, Segni dell'Ora,
   Creazione, Luoghi. Stessa forma: { titolo, arabo, categoria,
   descrizione, fonte }. Un solo motore: ricerca + griglia + dettaglio.
   La chiave della pagina è anche il nome della tabella nello store.
   ============================================================ */
/* ============================================================
   AZIONI — il magazzino da cui nasce la giornata.
   Non è una scheda-raccolta come i temi: un'azione si scrive con le sue
   fonti addosso — l'hadith che la fonda, il passo del Corano, la storia —
   e da lì diventa un'attività quotidiana.
   ============================================================ */
const AZ_CATS = { buona: 'Buone azioni', culto: 'Atti di culto', peccato: 'Peccati' };
const catLabel = (cfg, k) => (cfg && cfg.cats && cfg.cats[k]) || AZ_CATS[k] || k;

const azCard = x => {
  const tags = store.tagsDi(x.id, 'azione');
  const cad = store.tagsDi(x.id, 'azione', 'cadenza');
  const d = String(x.corpo || '');
  const n = store.attivitaDiAzione(x.id).length;
  return `<div class="card" onclick="openStudioDetail('azioni','${x.id}')">
    <span class="k">${esc(AZ_CATS[x.categoria] || x.categoria || 'Azione')}${n ? ' · ' + n + ' nella giornata' : ''}</span>
    <h3>${esc(x.titolo)}</h3>
    <p>${esc(d.slice(0, 140))}${d.length > 140 ? '…' : ''}</p>
    ${(tags.length || cad.length) ? `<div class="tgs">${
      cad.map(t => `<span class="tg cd">⏱ ${esc(t)}</span>`).join('')
      + tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
};
const pesoAzione = x => senzaSegni([x.titolo, x.corpo, store.tagsDi(x.id, 'azione').join(' '),
  store.tagsDi(x.id, 'azione', 'cadenza').join(' ')].filter(Boolean).join(' '));

let azCat = '', azKw = '', azTag = [], azCad = [];
function azSet(quale, v) { if (quale === 'cat') azCat = v; else azKw = v; azioniSearch(); }
function azTagToggle(t) {
  const i = azTag.indexOf(t);
  i >= 0 ? azTag.splice(i, 1) : azTag.push(t);
  renderAzioni();
}
function azCadToggle(t) {
  const i = azCad.indexOf(t);
  i >= 0 ? azCad.splice(i, 1) : azCad.push(t);
  renderAzioni();
}
function azioniClear() { azCat = ''; azKw = ''; azTag = []; azCad = []; renderAzioni(); }

function renderAzioni() {
  const opts = '<option value="">Tutte le categorie</option>' + Object.entries(AZ_CATS)
    .map(([k, v]) => `<option value="${k}" ${azCat === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
  let html = head('Azioni · الأعمال', 'Le azioni', 'Opere e loro peso: ciò che avvicina e ciò che allontana. Da qui nasce la tua giornata.');
  html += `<div class="add-voce" onclick="openModalTipo('azione')">＋ Aggiungi un'azione…</div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-2">
      <div class="qs-field"><label>Categoria</label>
        <select id="az-cat" onchange="azSet('cat',this.value)">${opts}</select></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="az-kw" placeholder="Nome, descrizione, tag…" value="${esc(azKw)}" oninput="azSet('kw',this.value)"></div>
      <button class="qs-clear" onclick="azioniClear()" title="Azzera">✕</button>
    </div></div>`;

  const fila = (quale, scelti, attributo, prefisso) => {
    const conta = new Map();
    store.list('azioni').forEach(x => store.tagsDi(x.id, 'azione', quale)
      .forEach(t => conta.set(t, (conta.get(t) || 0) + 1)));
    if (!conta.size) return '';
    return `<div class="pf-tags">${[...conta.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
      .map(([t, n]) => `<span class="chip ${scelti.includes(t) ? 'sel' : ''}" ${attributo}="${esc(t)}">${prefisso}${esc(t)}<span class="ch-n">${n}</span></span>`).join('')}</div>`;
  };
  html += fila('tag', azTag, 'data-atag', '#');
  /* la cadenza ha la sua fila, sotto: stessa meccanica, elenco separato */
  const cadenze = fila('cadenza', azCad, 'data-acad', '⏱ ');
  if (cadenze) html += `<div class="pf-lab">Cadenze</div>` + cadenze;

  html += `<div id="az-list"></div>`;
  $('#p-azioni').innerHTML = html;
  azioniSearch();
}

function azioniSearch() {
  const q = senzaSegni(azKw).trim();
  let list = store.list('azioni');
  if (azCat) list = list.filter(x => x.categoria === azCat);
  if (q) list = list.filter(x => pesoAzione(x).includes(q));
  if (azTag.length) list = list.filter(x => {
    const suoi = store.tagsDi(x.id, 'azione').map(senzaSegni);
    return azTag.map(senzaSegni).every(t => suoi.includes(t));
  });
  if (azCad.length) list = list.filter(x => {
    const sue = store.tagsDi(x.id, 'azione', 'cadenza').map(senzaSegni);
    return azCad.map(senzaSegni).every(t => sue.includes(t));
  });
  const box = $('#az-list');
  const conto = (azCat || q || azTag.length || azCad.length) ? `<div class="qs-count">${list.length} azioni</div>` : '';
  box.innerHTML = conto + (list.length
    ? `<div class="grid">${list.map(azCard).join('')}</div>`
    : `<div class="empty">${store.list('azioni').length
        ? 'Nessuna azione con questi filtri.' : "Nessuna azione ancora — aggiungine una qui sopra."}</div>`);
}

/* il nome resta `openStudioDetail` perché la richiamano in mezza app */
function openStudioDetail(key, id) {
  const x = store.get('azioni', id);
  if (!x) { toast('Azione non trovata'); return; }
  const catL = x.categoria ? ' · ' + esc(catLabel(null, x.categoria)) : '';
  let h = `<div class="reader"><div class="back" onclick="nav('azioni')">← Torna</div>`;
  h += `<div class="eye">Azioni · الأعمال${catL}</div><h1 class="t">${esc(x.titolo)}</h1>`;
  if (x.corpo) h += `<div class="trans">${esc(x.corpo)}</div>`;
  const tags = store.tagsDi(x.id, 'azione');
  const cad = store.tagsDi(x.id, 'azione', 'cadenza');
  if (tags.length || cad.length) h += `<div class="tgs" style="margin:4px 0 18px">${
    cad.map(t => `<span class="tg cd">⏱ ${esc(t)}</span>`).join('')
    + tags.map(t => `<span class="tg">#${esc(t)}</span>`).join('')}</div>`;
  h += bloccoAzione(x);
  h += `<div class="kh-btns">
    <button class="kh-b" onclick="openVoceEdit('azione','${x.id}')">✎ Modifica</button>
    <button class="kh-b del" onclick="eliminaVoce('azione','${x.id}')">🗑 Elimina</button></div>`;
  h += '</div>'; $('#p-detail').innerHTML = h; show('detail');
}

/* ============================================================
   AZIONI = magazzino della routine.
   hadith → azione → attività quotidiana.
   ============================================================ */
const evitare = x => x.categoria === 'peccato';

function bloccoAzione(x) {
  /* --- hadith che fondano questa azione --- */
  const link = store.collegatiA('azione', x.id, 'hadith');
  let h = `<h2>Hadith che la fondano</h2>`;
  h += link.map(l => {
    const hd = store.get('hadith', l.id);
    if (!hd) return '';
    return `<div class="note-b hd-link">
      <div class="l">${esc(hd.numero_rif || hd.raccolta)} · ${GRADO[hd.grado] || ''}</div>
      <div class="body" style="margin:0" onclick="openDetail('hadith','${hd.id}')">«${esc(hd.testo)}»</div>
      <button class="unlink" title="Scollega" onclick="scollegaHadith('${l.legame.id}','${x.id}')">✕</button></div>`;
  }).join('') || `<div class="empty" style="padding:12px">Nessun hadith collegato. Collegane uno: è il «perché» di questa azione.</div>`;

  const liberi = store.list('hadith').filter(hd => !link.some(l => String(l.id) === String(hd.id)));
  if (liberi.length) {
    h += `<div class="link-add">
      <select id="az-hd"><option value="">＋ collega un hadith…</option>
        ${liberi.map(hd => `<option value="${hd.id}">${esc(hd.numero_rif || hd.raccolta)} — ${esc(hd.testo.slice(0, 55))}…</option>`).join('')}
      </select>
      <button class="btn2" onclick="collegaHadith('${x.id}')">Collega</button></div>`;
  }

  /* --- gli altri collegamenti: il Corano, le storie, i temi --- */
  const altri = store.ancoreDiCosa('azione', x.id)
    .filter(a => ANCORE[a.tipo] && a.tipo !== 'hadith' && a.tipo !== 'azione')
    .map(a => ({ cfg: ANCORE[a.tipo], target: a.target, txt: ancoraTesto(a.tipo, a.target) }))
    .filter(a => a.txt);
  if (altri.length) {
    h += `<h2>Collegato a</h2><div class="tema-lista">${altri.map(a =>
      `<div class="tema-riga" onclick="${a.cfg.go(a.target)}">${a.cfg.ico} ${esc(a.txt)}</div>`).join('')}</div>`;
  }

  /* --- attività già derivate --- */
  const att = store.attivitaDiAzione(x.id);
  h += `<h2>Nella mia giornata</h2>`;
  h += att.map(a => `<div class="att-row ${a.attiva === false ? 'off' : ''}">
      <div class="ar-b"><div class="ar-n">${esc(a.nome)} ${a.verso === 'evitare' ? '<span class="vs-ev">da evitare</span>' : ''}</div>
      <div class="ar-m">${esc(store.ricLabel(a))}${store.oraLabel(a) ? ' · ' + esc(store.oraLabel(a)) : ''} · ${esc(momLabel(a.momento))}</div></div>
      <button class="tb no" title="Rimuovi dalla giornata" onclick="rimuoviAttivita('${a.id}')">✕</button>
    </div>`).join('') || `<div class="empty" style="padding:12px">Non è ancora una tua abitudine.</div>`;

  h += `<button class="add big-add" onclick="openAttivita('${x.id}')">${evitare(x)
    ? '⊘ Mettila tra le cose da evitare'
    : '＋ Portala nella mia giornata'}</button>`;
  return h;
}

const momLabel = k => (store.momenti.find(m => m.k === k) || {}).t || k;

/* ---- pannello: da azione a attività quotidiana ---- */
let attDraft = null;
const GG_IT = [['1', 'lun'], ['2', 'mar'], ['3', 'mer'], ['4', 'gio'], ['5', 'ven'], ['6', 'sab'], ['0', 'dom']];
const MESI_H_SEL = ['Muḥarram', 'Ṣafar', 'Rabīʿ I', 'Rabīʿ II', 'Jumādā I', 'Jumādā II', 'Rajab', 'Shaʿbān', 'Ramaḍān', 'Shawwāl', 'Dhū al-qaʿda', 'Dhū al-ḥijja'];

/* apre il pannello: da un'azione (nuova) o su un'attività esistente (modifica) */
function openAttivita(azioneId, attId) {
  if (attId) {
    attDraft = JSON.parse(JSON.stringify(store.list('attivita').find(a => String(a.id) === String(attId))));
    $('#att-s').textContent = 'Modifica come e quando torna.';
  } else {
    const az = store.get('azioni', azioneId);
    attDraft = {
      azione_id: az ? az.id : null, adhkar_id: null,
      nome: az ? az.titolo : '', verso: az && evitare(az) ? 'evitare' : 'fare',
      momento: 'risveglio', ancora: 'libera', ora: '', preghiera: 'maghrib', offset_min: 0,
      ricorrenza: { tipo: 'quotidiana' }, inizio: store.today(), fine: '', attiva: true, ripetizioni: '',
    };
    $('#att-s').textContent = az
      ? (evitare(az) ? `Da evitare, a partire da «${az.titolo}».` : `Nasce da «${az.titolo}».`)
      : 'Da dove nasce, quando torna, per quanto tempo.';
  }
  $('#att-h2').textContent = attDraft.verso === 'evitare' ? 'Tra le cose da evitare' : 'Nella mia giornata';
  renderAttForm();
  $('#veil-att').classList.add('on');
}
function closeAttivita() { $('#veil-att').classList.remove('on'); attDraft = null; }

/* legge i campi visibili dentro la bozza (prima di ridisegnare o salvare) */
function attRead() {
  const d = attDraft; if (!d) return;
  const g = id => { const e = document.getElementById(id); return e ? e.value : undefined; };
  if (g('at-nome') !== undefined) d.nome = g('at-nome').trim();
  if (g('at-mom') !== undefined) d.momento = g('at-mom');
  if (g('at-anc') !== undefined) d.ancora = g('at-anc');
  if (g('at-ora') !== undefined) d.ora = g('at-ora');
  if (g('at-pre') !== undefined) d.preghiera = g('at-pre');
  if (g('at-off') !== undefined) d.offset_min = +g('at-off') || 0;
  if (g('at-rip') !== undefined) d.ripetizioni = g('at-rip').trim();
  if (g('at-inizio') !== undefined) d.inizio = g('at-inizio');
  if (g('at-fine') !== undefined) d.fine = g('at-fine');
  if (g('at-ric') !== undefined) {
    const t = g('at-ric'); const r = { tipo: t };
    if (t === 'settimanale') r.giorni = [...document.querySelectorAll('.gg-c.sel')].map(e => +e.dataset.g);
    if (t === 'mensile_hijri') r.giorni = (g('at-gh') || '').split(',').map(s => +s.trim()).filter(n => n >= 1 && n <= 30);
    if (t === 'annuale_hijri') {
      r.mese = +g('at-mh') || 1;
      if (g('at-gmh')) r.giorno = +g('at-gmh');
    }
    d.ricorrenza = r;
  }
}
function attSet(campo, val) { attRead(); attDraft[campo] = val; renderAttForm(); }
function attGG(g) {
  attRead();
  const arr = attDraft.ricorrenza.giorni || [];
  const i = arr.indexOf(g); i >= 0 ? arr.splice(i, 1) : arr.push(g);
  attDraft.ricorrenza.giorni = arr; renderAttForm();
}

/* interruttore fare/evitare: acceso, semplifica la form ai soli campi che contano */
function attVerso() {
  attRead();
  const d = attDraft;
  d.verso = d.verso === 'evitare' ? 'fare' : 'evitare';
  /* orario e ripetizioni non hanno senso per una cosa da evitare: le azzero
     invece di lasciarle nascoste nella bozza */
  if (d.verso === 'evitare') {
    d.ancora = 'libera'; d.ora = ''; d.preghiera = ''; d.offset_min = 0; d.ripetizioni = '';
  }
  $('#att-h2').textContent = d.verso === 'evitare' ? 'Tra le cose da evitare' : 'Nella mia giornata';
  renderAttForm();
}

function renderAttForm() {
  const d = attDraft, r = d.ricorrenza || { tipo: 'quotidiana' };
  const ev = d.verso === 'evitare';
  const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
  let h = fld('at-nome', 'Nome', 'input', `value="${esc(d.nome)}"`);

  /* --- interruttore fare / evitare --- */
  h += `<div class="f"><label>Come la vivo</label>
    <div class="chips"><span class="chip vs-tog ${ev ? 'sel' : ''}" onclick="attVerso()">⊘ Da evitare</span></div>
    <div class="set-info">${ev
      ? 'Spuntarla vorrà dire <b>non ci sono cascato</b>. Vale tutta la giornata, quindi niente orario né ripetizioni.'
      : 'Spenta: è una cosa da <b>fare</b>. Accendila per le cose da cui stare lontano.'}</div></div>`;

  h += ev
    ? fld('at-mom', 'Momento', 'select', store.momenti.map(m => opt(m.k, m.t + ' — ' + m.q, d.momento)).join(''))
    : `<div class="row2">
        ${fld('at-mom', 'Momento', 'select', store.momenti.map(m => opt(m.k, m.t + ' — ' + m.q, d.momento)).join(''))}
        ${fld('at-rip', 'Ripetizioni (facolt.)', 'input', `value="${esc(d.ripetizioni)}" placeholder="33×3"`)}
      </div>`;

  /* --- quando: solo per le cose da fare --- */
  if (!ev) {
    h += `<div class="f"><label>Quando</label>
      <select id="at-anc" onchange="attSet('ancora',this.value)">
        ${opt('libera', 'Nessun orario — vale tutto il giorno', d.ancora)}
        ${opt('ora_fissa', 'A un orario fisso', d.ancora)}
        ${opt('preghiera', 'Agganciata a una preghiera', d.ancora)}
      </select></div>`;
    if (d.ancora === 'ora_fissa') h += fld('at-ora', 'Orario', 'input', `type="time" value="${esc(d.ora)}"`);
    if (d.ancora === 'preghiera') h += `<div class="row2">
        ${fld('at-pre', 'Preghiera', 'select', store.preghiere.map(p => opt(p.k, p.t, d.preghiera)).join(''))}
        ${fld('at-off', 'Scarto in minuti', 'input', `type="number" step="5" value="${d.offset_min || 0}"`)}
      </div>`;
  }

  /* --- ricorrenza --- */
  h += `<div class="f"><label>Ogni quanto</label>
    <select id="at-ric" onchange="attSet('ricorrenza',{tipo:this.value})">
      ${opt('quotidiana', 'Ogni giorno', r.tipo)}
      ${opt('settimanale', 'Alcuni giorni della settimana', r.tipo)}
      ${opt('mensile_hijri', 'Giorni del mese hijri (es. i giorni bianchi)', r.tipo)}
      ${opt('annuale_hijri', 'Un mese hijri (Ramaḍān, Shawwāl…)', r.tipo)}
    </select></div>`;
  if (r.tipo === 'settimanale')
    h += `<div class="f"><label>Giorni</label><div class="chips">${GG_IT.map(([g, l]) =>
      `<span class="chip gg-c ${(r.giorni || []).includes(+g) ? 'sel' : ''}" data-g="${g}" onclick="attGG(${g})">${l}</span>`).join('')}</div></div>`;
  if (r.tipo === 'mensile_hijri')
    h += fld('at-gh', 'Giorni del mese (separati da virgola)', 'input', `value="${(r.giorni || [13, 14, 15]).join(',')}" placeholder="13,14,15"`)
      + `<div class="set-info">13, 14 e 15 sono i <b>giorni bianchi</b>: tornano ogni mese lunare.</div>`;
  if (r.tipo === 'annuale_hijri')
    h += `<div class="row2">
      ${fld('at-mh', 'Mese', 'select', MESI_H_SEL.map((m, i) => opt(i + 1, m, r.mese || 9)).join(''))}
      ${fld('at-gmh', 'Giorno (vuoto = tutto il mese)', 'input', `type="number" min="1" max="30" value="${r.giorno || ''}"`)}
    </div>`;

  h += `<div class="row2">
    ${fld('at-inizio', 'Inizia il', 'input', `type="date" value="${esc(d.inizio)}"`)}
    ${fld('at-fine', 'Finisce il (facolt.)', 'input', `type="date" value="${esc(d.fine)}"`)}
  </div>`;
  $('#att-form').innerHTML = h;
}

function salvaAttivita() {
  attRead();
  const d = attDraft;
  if (!d.nome) { toast('Serve il nome'); return; }
  if (d.id) store.updAttivita(d.id, d); else store.addAttivita(d);
  const az = d.azione_id;
  closeAttivita();
  if (az) openStudioDetail('azioni', az); else renderImpostazioni();
  toast(d.verso === 'evitare' ? 'Aggiunta tra le cose da evitare ✓' : 'Ora è nella tua giornata ✓');
}

function collegaHadith(azioneId) {
  const v = $('#az-hd').value;
  if (!v) { toast('Scegli un hadith'); return; }
  store.collega('azione', azioneId, 'hadith', v, 'fondata_su');
  openStudioDetail('azioni', azioneId); toast('Hadith collegato ✓');
}
function scollegaHadith(legameId, azioneId) {
  store.scollega(legameId);
  openStudioDetail('azioni', azioneId); toast('Scollegato');
}
/* ============================================================
   HADITH — l'altro capo del flusso.
   Da qui nascono le azioni, si citano i personaggi, si scrivono pensieri.
   ============================================================ */
const RUOLI = { riporta: '🗣 lo riporta', citato: '👤 compare nel racconto' };

function bloccoHadith(x) {
  let h = '';

  /* --- i tag: cliccabili, portano nella ricerca degli hadith --- */
  const tags = store.tagsDi(x.id, 'hadith');
  if (tags.length) h += `<div class="tgs" style="margin:4px 0 18px">${tags.map(t =>
    `<span class="tg" onclick="cercaHadithTag('${esc(t).replace(/'/g, '&#39;')}')" title="Cerca gli hadith con questo tag">#${esc(t)}</span>`).join('')}</div>`;

  /* --- personaggi: chi lo riporta, chi c'è dentro --- */
  const pers = store.collegatiA('hadith', x.id, 'personaggio');
  h += `<h2>Personaggi</h2>`;
  h += pers.map(l => {
    const p = store.get('personaggi', l.id);
    if (!p) return '';
    return `<div class="att-row">
      <div class="ar-b"><div class="ar-n" onclick="openDetail('personaggio','${p.id}')" style="cursor:pointer">${esc(p.titolo)}</div>
      <div class="ar-m">${RUOLI[l.legame.relazione] || l.legame.relazione} · ${esc(CAT[p.categoria] || '')}</div></div>
      <button class="tb no" title="Scollega" onclick="scollegaDaHadith('${l.legame.id}','${x.id}')">✕</button></div>`;
  }).join('') || `<div class="empty" style="padding:12px">Nessuno collegato. Chi lo riporta? Chi compare nel racconto?</div>`;

  const pLiberi = store.list('personaggi').filter(p => !pers.some(l => String(l.id) === String(p.id)));
  if (pLiberi.length) h += `<div class="link-add">
    <select id="hd-pers"><option value="">＋ collega un personaggio…</option>
      ${pLiberi.map(p => `<option value="${p.id}">${esc(p.titolo)}</option>`).join('')}</select>
    <select id="hd-ruolo">${Object.entries(RUOLI).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <button class="btn2" onclick="collegaPersonaggio('${x.id}')">Collega</button></div>`;

  /* --- azioni che ne nascono: il flusso inverso --- */
  const az = store.list('legami')
    .filter(l => l.a_tipo === 'hadith' && String(l.a_id) === String(x.id) && l.da_tipo === 'azione');
  h += `<h2>Azioni che ne nascono</h2>`;
  h += az.map(l => {
    const a = store.get('azioni', l.da_id);
    if (!a) return '';
    const n = store.attivitaDiAzione(a.id).length;
    return `<div class="att-row">
      <div class="ar-b"><div class="ar-n" onclick="openStudioDetail('azioni','${a.id}')" style="cursor:pointer">⚖️ ${esc(a.titolo)}</div>
      <div class="ar-m">${esc(catLabel(null, a.categoria))}${n ? ` · ${n} nella mia giornata` : ' · non ancora praticata'}</div></div>
      <button class="tb no" title="Scollega" onclick="scollegaDaHadith('${l.id}','${x.id}')">✕</button></div>`;
  }).join('') || `<div class="empty" style="padding:12px">Nessuna azione nasce ancora da questo hadith.</div>`;

  const azLibere = store.list('azioni').filter(a => !az.some(l => String(l.da_id) === String(a.id)));
  h += `<div class="link-add">
    <select id="hd-az"><option value="">collega un'azione esistente…</option>
      ${azLibere.map(a => `<option value="${a.id}">${esc(a.titolo)}</option>`).join('')}</select>
    <button class="btn2" onclick="collegaAzione('${x.id}')">Collega</button></div>`;
  h += `<div class="link-add nuova-az">
    <input id="hd-aznome" placeholder="…oppure creane una nuova da qui">
    <select id="hd-azcat">${Object.entries(AZ_CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <button class="add" onclick="creaAzioneDaHadith('${x.id}')">＋ Crea azione</button></div>`;

  /* --- pensieri nati qui --- */
  const pens = store.pensieriDi('hadith', x.id);
  h += `<h2>Pensieri nati qui</h2>`;
  h += pens.map(p => `<div class="note-b"><div class="l">${esc(p.data || '')}</div>
    <div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('')
    || `<div class="empty" style="padding:12px">Nessuno ancora.</div>`;
  h += `<div class="think think-b">💭<input id="hd-pens" placeholder="Un pensiero su questo hadith…">
    <button class="go" onclick="pensieroDaHadith('${x.id}')">Salva</button></div>`;
  return h;
}

function collegaPersonaggio(hid) {
  const p = $('#hd-pers').value; if (!p) { toast('Scegli un personaggio'); return; }
  store.collega('hadith', hid, 'personaggio', p, $('#hd-ruolo').value);
  openDetail('hadith', hid); toast('Personaggio collegato ✓');
}
function collegaAzione(hid) {
  const a = $('#hd-az').value; if (!a) { toast("Scegli un'azione"); return; }
  store.collega('azione', a, 'hadith', hid, 'fondata_su');
  openDetail('hadith', hid); toast('Azione collegata ✓');
}
/* crea l'azione E la collega: il flusso hadith → azione → attività */
function creaAzioneDaHadith(hid) {
  const nome = val('hd-aznome');
  if (!nome) { toast("Scrivi il nome dell'azione"); return; }
  const hd = store.get('hadith', hid);
  const a = store.add('azioni', { titolo: nome, categoria: $('#hd-azcat').value, corpo: '' });
  store.collega('azione', a.id, 'hadith', hid, 'fondata_su');
  counts(); openStudioDetail('azioni', a.id);
  toast('Azione creata — ora portala nella tua giornata');
}
function scollegaDaHadith(legameId, hid) {
  store.scollega(legameId); openDetail('hadith', hid); toast('Scollegato');
}
function pensieroDaAya(vid) {
  const inp = $('#ay-pens'); const t = inp.value.trim();
  if (!t) { toast('Scrivi prima il pensiero'); return; }
  store.addPensiero(t, [{ tipo: 'versetto', id: vid }]);
  counts(); openDetail('versetto', vid);
  toast('Pensiero salvato · lo trovi anche in Pensieri');
}

function pensieroDaHadith(hid) {
  const inp = $('#hd-pens'); const t = inp.value.trim();
  if (!t) { toast('Scrivi prima il pensiero'); return; }
  store.addPensiero(t, [{ tipo: 'hadith', id: hid }]);
  counts(); openDetail('hadith', hid);
  toast('Pensiero salvato · lo trovi anche in Pensieri');
}

function rimuoviAttivita(id) {
  const a = store.list('attivita').find(x => String(x.id) === String(id));
  const az = a ? a.azione_id : null;
  store.delAttivita(id);
  if (az) openStudioDetail('azioni', az); else renderImpostazioni();
  toast('Rimossa dalla giornata');
}

/* ============================================================
   ALLAH — Asmāʾ al-Ḥusnā (i 99 Nomi più belli)
   ============================================================ */
function renderAllah() {
  let html = `<div class="allah-hero">
    <div class="ah-name">اللّٰه</div>
    <div class="ah-sub">Asmāʾ al-Ḥusnā · الأسماء الحسنى</div>
    <p class="ah-q">«Ad Allah appartengono i nomi più belli: invocateLo con essi.»<span>al-Aʿrāf · 7:180</span></p>
  </div>`;
  html += `<div class="quran-search"><div class="qs-grid qs-grid-1">
      <div class="qs-field qs-kw"><label>Cerca un Nome</label>
        <input id="as-kw" placeholder="Nome, traslitterazione o significato…" oninput="asmaSearch()"></div>
      <button class="qs-clear" onclick="asmaClear()" title="Azzera">✕</button>
    </div></div>
  <div id="asma-list"></div>`;
  $('#p-allah').innerHTML = html;
  asmaSearch();
}
function asmaCard(x) {
  return `<div class="asma-card" onclick="openAsmaDetail('${x.id}')">
    ${x.spiegazione ? '<span class="as-note-dot" title="Ha la nota di dizionario"></span>' : ''}
    <div class="as-num">${x.numero}</div>
    <div class="as-ar">${esc(x.arabo)}</div>
    <div class="as-tr">${esc(x.translit)}</div>
    <div class="as-me">${esc(x.significato)}</div></div>`;
}
function asmaSearch() {
  const kw = ($('#as-kw').value || '').trim().toLowerCase();
  let list = store.list('asma');
  if (kw) list = list.filter(x => (x.arabo + ' ' + x.translit + ' ' + x.significato + ' ' + x.numero).toLowerCase().includes(kw));
  const box = $('#asma-list');
  const count = kw ? `<div class="qs-count">${list.length} nomi</div>` : '';
  const conNota = list.filter(x => x.spiegazione).length;
  const note = `<div class="mz-page-head" style="margin-top:20px">I Nomi più belli
    <span class="mz-note">${list.length} Nomi · ${conNota} con la nota di dizionario</span></div>`;
  box.innerHTML = (kw ? count : note) + (list.length
    ? `<div class="asma-grid">${list.map(asmaCard).join('')}</div>`
    : `<div class="empty">Nessun Nome trovato.</div>`);
}
function asmaClear() { $('#as-kw').value = ''; asmaSearch(); }
function openAsmaDetail(id) {
  const x = store.get('asma', id);
  const pens = store.pensieriDi('asma', id);
  let h = `<div class="reader"><div class="back" onclick="nav('allah')">← Torna</div>`;
  h += `<div class="eye">Asmāʾ al-Ḥusnā · Nome ${x.numero}</div>
    <div class="ayah" style="font-size:40px;text-align:center;padding:26px 26px 12px">${esc(x.arabo)}</div>
    <h1 class="as-titolo">${esc(x.translit)} <span>· ${esc(x.significato)}</span></h1>`;

  /* La descrizione del Nome: `asma.spiegazione`. È contenuto canonico ma si
     scrive da qui, perché l'archivio ha un redattore: la policy
     `asma_scrittura_admin` lascia passare solo lui. */
  h += `<div class="dict-head"><h2>Descrizione</h2>
      <button class="dict-edit" onclick="asmaEditDesc('${id}')">${x.spiegazione ? '✎ Modifica' : '＋ Scrivi'}</button>
    </div>
    <div id="as-desc">${asmaDescBlocco(x)}</div>`;

  /* I pensieri si legano al Nome come `si_riferisce_a`, non `nato_da`: il pensiero
     non nasce dal Nome, parla dell'attributo. Si collega quando scrivi della Sua
     misericordia, non quando citi Ar-Raḥīm. */
  h += `<h2>Pensieri su questo Nome</h2>
    <p class="hint">Quello che matura nel tempo su questo attributo — non dove il Nome è citato,
      ma quando è di questo che stai parlando.</p>`;
  h += pens.map(p => `<div class="note-b"><div class="l">${esc(p.giorno || 'pensiero')}</div>
    <div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('')
    || `<div class="empty" style="padding:14px">Nessuno ancora.</div>`;
  h += `<div class="think think-b">💭<input id="as-pens" placeholder="Un pensiero su questo Nome…">
    <button class="go" onclick="pensieroDaAsma('${id}')">Salva</button></div>`;
  h += '</div>'; $('#p-detail').innerHTML = h; show('detail');
}
function asmaDescBlocco(x) {
  return x.spiegazione
    ? `<div class="dict">${esc(x.spiegazione)}</div>`
    : `<div class="dict vuota">Ancora nessuna descrizione. Scrivi cosa dice la radice araba,
        che differenza porta rispetto ai Nomi vicini, dove il Corano lo usa.</div>`;
}
/* la descrizione si edita in posto: il riquadro diventa l'area di scrittura */
function asmaEditDesc(id) {
  const x = store.get('asma', id);
  $('#as-desc').innerHTML = `<textarea class="dict-ta" id="as-desc-ta" rows="9"
      placeholder="Radice araba e cosa dice letteralmente · che differenza porta rispetto ai Nomi vicini · dove il Corano lo usa">${esc(x.spiegazione || '')}</textarea>
    <div class="dict-btns"><button class="btn2 salva" onclick="asmaSalvaDesc('${id}')">Salva</button>
      <button class="btn2" onclick="asmaAnnullaDesc('${id}')">Annulla</button></div>`;
  const ta = $('#as-desc-ta'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
function asmaSalvaDesc(id) {
  const t = ($('#as-desc-ta').value || '').trim();
  store.setSpiegazioneAsma(id, t);
  openAsmaDetail(id);
  toast(t ? 'Descrizione salvata' : 'Descrizione svuotata');
}
function asmaAnnullaDesc(id) { openAsmaDetail(id); }

function pensieroDaAsma(id) {
  const t = ($('#as-pens').value || '').trim();
  if (!t) { toast('Scrivi prima il pensiero'); return; }
  const p = store.addPensiero(t, []);
  store.collega('pensiero', p.id, 'asma', id, 'si_riferisce_a');
  counts(); openAsmaDetail(id);
  toast('Pensiero salvato · lo trovi anche in Pensieri');
}

/* ============================================================
   IMPOSTAZIONI — tutto salva subito (niente pulsante Salva).
   app.js legge/scrive solo store.getSettings()/setSettings().
   ============================================================ */
const TZ_LIST = ['UTC', 'Africa/Casablanca', 'Europe/Rome', 'Europe/London', 'Europe/Paris', 'Asia/Istanbul', 'Asia/Riyadh', 'Asia/Dubai', 'America/New_York'];
const tzLabel = tz => tz === 'UTC' ? 'UTC' : tz.split('/').pop().replace('_', ' ');
/* sezioni della sidebar che si possono nascondere (tutte tranne Oggi e Impostazioni) */
/* stesso ordine della sidebar: Azioni sta nella mia vita, non nello studio */
const TOGGLE_SEZIONI = [
  ['lettura', 'Lettura'], ['memorizzazione', 'Memorizzazione'], ['ascolto', 'Ascolto'], ['pensieri', 'Pensieri'],
  ['azioni', 'Azioni'],
  ['allah', 'Allah'], ['quran', 'Corano'], ['hadith', 'Hadith'], ['people', 'Personaggi'],
  ['stories', 'Storie'], ['themes', 'Temi'], ['fiqh', 'Fiqh'],
  ['segni_ora', "Segni dell'Ora"], ['creazione', 'Creazione'], ['luoghi', 'Luoghi'],
];

/* nasconde/mostra le voci di menu secondo le impostazioni */
function applySezioni() {
  const sez = store.getSettings().vista.sezioni;
  TOGGLE_SEZIONI.forEach(([k]) => {
    const el = document.querySelector(`.lnk[data-p="${k}"]`);
    if (el) el.style.display = sez[k] === false ? 'none' : '';
  });
}
/* rigenera Oggi (widget + momenti) dopo un cambio impostazioni */
function refreshOggi() { renderOggi(); }

const chipTog = (on, label, onclick) => `<span class="chip ${on ? 'sel' : ''}" onclick="${onclick}">${on ? '✓ ' : ''}${esc(label)}</span>`;
const stepper = (val, dec, inc, suffix) => `<span class="stepper"><button onclick="${dec}">−</button><span class="v">${val >= 0 && suffix === 'min' ? '+' : ''}${val}${suffix === 'min' ? '′' : ''}</span><button onclick="${inc}">+</button></span>`;

function renderImpostazioni() {
  const S = store.getSettings();
  let html = head('Impostazioni · الإعدادات', 'Impostazioni', 'Ogni modifica si salva da sola.');

  /* ---- 1 · TEMPO ---- */
  const tzOpts = TZ_LIST.map(tz => `<option value="${tz}" ${S.tempo.fuso === tz ? 'selected' : ''}>${esc(tzLabel(tz))}</option>`).join('');
  html += `<div class="hd">🕐 Tempo</div><div class="card set-card">
    <div class="f"><label>Ora principale (fuso)</label>
      <select onchange="setFuso(this.value)">${tzOpts}</select></div>
    <div class="f"><label>Fusi affiancati</label>
      <div class="chips">${TZ_LIST.filter(tz => tz !== S.tempo.fuso).map(tz => chipTog(S.tempo.fusi_extra.includes(tz), tzLabel(tz), `toggleFusoExtra('${tz}')`)).join('')}</div></div>
    <div class="f"><label>Formato ora</label>
      <div class="chips">${chipTog(S.tempo.formato === '24h', '24 ore', "setFormato('24h')")}${chipTog(S.tempo.formato === '12h', '12 ore', "setFormato('12h')")}</div></div>
    <div class="f"><label>Calendario hijri</label>
      <div class="set-row">${chipTog(S.tempo.hijri_mostra, 'Mostra la data hijri', 'toggleHijri()')}
        <span class="set-lbl" style="margin:0">correzione</span>
        ${stepper(S.tempo.hijri_offset, 'setHijriOffset(-1)', 'setHijriOffset(1)', 'gg')} <span class="set-lbl" style="margin:0">giorni</span></div></div>
  </div>`;

  /* ---- 2 · PREGHIERE ---- */
  const attivo = S.preghiere.luoghi.find(l => l.id === S.preghiere.luogo_attivo);
  html += `<div class="hd">🕌 Preghiere</div><div class="card set-card">
    <div class="set-lbl">Luoghi salvati</div>
    ${S.preghiere.luoghi.map(l => `<div class="set-place ${l.id === S.preghiere.luogo_attivo ? 'on' : ''}">
      <span class="pname" onclick="setLuogoAttivo('${l.id}')">${l.id === S.preghiere.luogo_attivo ? '● ' : '○ '}${esc(l.nome)} <span class="set-lbl" style="margin:0;display:inline">${esc(tzLabel(l.tz))}</span></span>
      <button class="rm" onclick="delLuogo('${l.id}')" title="Elimina">✕</button></div>`).join('')}
    <div class="set-add">
      <input id="lg-nome" placeholder="Nome luogo">
      <input id="lg-lat" type="number" step="0.0001" placeholder="lat">
      <input id="lg-lon" type="number" step="0.0001" placeholder="lon">
      <select id="lg-tz">${TZ_LIST.map(tz => `<option value="${tz}">${esc(tzLabel(tz))}</option>`).join('')}</select>
      <button class="add" onclick="addLuogo()">Aggiungi</button></div>

    <div class="set-lbl">Cambio luogo</div>
    <div class="chips">${chipTog(S.preghiere.cambio === 'manuale', 'Manuale', "setCambio('manuale')")}${chipTog(S.preghiere.cambio === 'auto', 'Automatico (posizione)', "setCambio('auto')")}</div>

    <div class="set-info">Origine orari: <b>calcolo di riserva</b> · orari d'esempio. Con Supabase arriverà il calendario caricato${attivo ? ' per ' + esc(attivo.nome) : ''}, con il mese di validità.</div>

    <div class="set-lbl">Correzione per preghiera (minuti)</div>
    ${store.preghiere.map(pr => `<div class="set-row"><span style="min-width:78px">${esc(pr.t)}</span>${stepper(S.preghiere.correzioni[pr.k] || 0, `setCorrezione('${pr.k}',-1)`, `setCorrezione('${pr.k}',1)`, 'min')}</div>`).join('')}

    <div class="set-lbl">Mostra sull'arco solare</div>
    <div class="chips">${store.preghiere.map(pr => chipTog(S.preghiere.mostra[pr.k], pr.t, `togglePreghiera('${pr.k}')`)).join('')}</div>
  </div>`;

  /* ---- 3 · VISUALIZZAZIONE ---- */
  html += `<div class="hd">👁 Visualizzazione</div><div class="card set-card">
    <div class="set-lbl">Widget in Oggi</div>
    <div class="chips">
      ${chipTog(S.vista.widget.arco, 'Arco solare', "toggleWidget('arco')")}
      ${chipTog(S.vista.widget.marea, 'Marea', "toggleWidget('marea')")}
      ${chipTog(S.vista.widget.luna, 'Luna', "toggleWidget('luna')")}</div>

    <div class="set-lbl">Sezioni nel menu</div>
    <div class="chips">${TOGGLE_SEZIONI.map(([k, lab]) => chipTog(S.vista.sezioni[k] !== false, lab, `toggleSezione('${k}')`)).join('')}</div>

    <div class="set-lbl">Momenti attivi in Oggi</div>
    <div class="chips">${store.momenti.map(m => chipTog(S.vista.momenti[m.k] !== false, m.t, `toggleMomento('${m.k}')`)).join('')}</div>
  </div>`;

  /* ---- 3.2 · FONTI ----
     Scritte una volta qui, poi si pescano da un menu ovunque servano. */
  const fnt = store.fontiDiTipo('raccolta');
  html += `<div class="hd">📚 Fonti <span class="hd-c">${fnt.length}</span></div><div class="card set-card">
    <div class="set-info">Le raccolte e le opere da cui citi. Il modale dell'hadith le pesca da qui: scrivi «Bukhārī» una volta sola.</div>
    ${fnt.map(f => {
      const usi = store.usiDiFonte(f.nome);
      return `<div class="set-place">
        <span class="pname">${esc(f.nome)}${f.nota ? ` <span class="set-lbl" style="margin:0;display:inline">${esc(f.nota)}</span>` : ''}${usi ? ` <span class="hd-c">${usi}</span>` : ''}</span>
        <button class="rm" onclick="delFonte('${f.id}')" title="${usi ? 'Usata da ' + usi + ' hadith' : 'Elimina'}">✕</button></div>`;
    }).join('') || `<div class="empty" style="padding:12px">Nessuna fonte. Aggiungine una qui sotto.</div>`}
    <div class="set-add">
      <input id="fn-nome" placeholder="Nome breve — Bukhārī" onkeydown="if(event.key==='Enter')addFonte()">
      <input id="fn-nota" placeholder="Titolo per esteso (facolt.) — Ṣaḥīḥ al-Bukhārī" onkeydown="if(event.key==='Enter')addFonte()">
      <button class="add" onclick="addFonte()">Aggiungi</button></div>
  </div>`;

  /* ---- 3.5 · LA MIA ROUTINE ---- */
  const rt = store.list('attivita');
  html += `<div class="hd">🔁 La mia routine <span class="hd-c">${rt.length}</span></div><div class="card set-card">
    <div class="set-info">Le attività nascono dal magazzino <b onclick="nav('azioni')" style="cursor:pointer;color:var(--brass)">Azioni</b>: apri un'azione, collegale gli hadith che la fondano e portala nella giornata.</div>`;
  html += store.momenti.map(m => {
    const items = rt.filter(a => a.momento === m.k);
    if (!items.length) return '';
    return `<div class="set-lbl">${m.ico} ${m.t}</div>` + items.map(a => {
      const oraL = store.oraLabel(a);
      return `<div class="att-row ${a.attiva === false ? 'off' : ''}">
        <div class="ar-b">
          <div class="ar-n">${esc(a.nome)} ${a.verso === 'evitare' ? '<span class="vs-ev">da evitare</span>' : ''}</div>
          <div class="ar-m">${esc(store.ricLabel(a))}${oraL ? ' · ' + esc(oraL) : ''}${a.fine ? ' · fino al ' + esc(a.fine) : ''}</div>
        </div>
        <button class="tb" title="${a.attiva === false ? 'Riattiva' : 'Sospendi'}" onclick="toggleAttiva('${a.id}')">${a.attiva === false ? '○' : '●'}</button>
        <button class="tb" title="Modifica" onclick="openAttivita(null,'${a.id}')">✎</button>
        <button class="tb no" title="Elimina" onclick="rimuoviAttivita('${a.id}')">✕</button>
      </div>`;
    }).join('');
  }).join('') || `<div class="empty" style="padding:14px">Nessuna attività. Vai in Azioni e portane una nella tua giornata.</div>`;
  html += `</div>`;

  /* ---- 4 · DATI ---- */
  html += `<div class="hd">🗄 Dati</div><div class="card set-card">
    <div class="set-row"><button class="btn2" onclick="exportJSON()">⬇ Esporta tutto (JSON)</button>
      <button class="btn2" style="border-color:var(--terra);color:var(--terra)" onclick="if(confirm('Azzerare TUTTI i dati locali? L\\'operazione non è reversibile.')){store.reset()}">🗑 Azzera dati locali</button></div>
    <div class="set-info">L'esportazione scarica un file con tutto (voci, pensieri, khatam, impostazioni): la tua rete di sicurezza prima della migrazione a Supabase.</div>
  </div>`;

  $('#p-impostazioni').innerHTML = html;
}

/* ---- Tempo ---- */
function setFuso(tz) { store.setSettings({ tempo: { fuso: tz } }); renderImpostazioni(); refreshOggi(); }
function toggleFusoExtra(tz) {
  const arr = store.getSettings().tempo.fusi_extra.slice();
  const i = arr.indexOf(tz); i >= 0 ? arr.splice(i, 1) : arr.push(tz);
  store.setSettings({ tempo: { fusi_extra: arr } }); renderImpostazioni(); refreshOggi();
}
function setFormato(f) { store.setSettings({ tempo: { formato: f } }); renderImpostazioni(); refreshOggi(); }
function toggleHijri() { store.setSettings({ tempo: { hijri_mostra: !store.getSettings().tempo.hijri_mostra } }); renderImpostazioni(); refreshOggi(); }
function setHijriOffset(delta) {
  let v = store.getSettings().tempo.hijri_offset + delta; v = Math.max(-2, Math.min(2, v));
  store.setSettings({ tempo: { hijri_offset: v } }); renderImpostazioni(); refreshOggi();
}
/* ---- Preghiere ---- */
function setCambio(mode) { store.setSettings({ preghiere: { cambio: mode } }); renderImpostazioni(); }
function setLuogoAttivo(id) { store.setSettings({ preghiere: { luogo_attivo: id } }); renderImpostazioni(); refreshOggi(); }
/* ---- Fonti ---- */
function addFonte() {
  const nome = val('fn-nome');
  if (!nome) { toast('Serve il nome della fonte'); return; }
  const gia = store.fontiDiTipo().some(f => f.nome.toLowerCase() === nome.toLowerCase());
  store.addFonte(nome, 'raccolta', val('fn-nota'));
  renderImpostazioni();
  toast(gia ? 'Questa fonte c’era già' : 'Fonte aggiunta ✓');
}
function delFonte(id) {
  const f = store.fontiDiTipo().find(x => String(x.id) === String(id));
  if (!f) return;
  const usi = store.usiDiFonte(f.nome);
  /* si cancella solo la voce di elenco: gli hadith già scritti tengono
     il nome della raccolta nel loro testo, non si toccano */
  const avviso = usi
    ? `«${f.nome}» è citata da ${usi} hadith. Togliendola dall'elenco non potrai più sceglierla, ma quegli hadith restano com'erano. Procedo?`
    : `Togliere «${f.nome}» dall'elenco delle fonti?`;
  if (!confirm(avviso)) return;
  store.delFonte(id);
  renderImpostazioni();
  toast('Fonte tolta');
}

function addLuogo() {
  const nome = val('lg-nome'); if (!nome) { toast('Serve il nome del luogo'); return; }
  const arr = store.getSettings().preghiere.luoghi.slice();
  const id = Math.max(0, ...arr.map(l => l.id)) + 1;
  arr.push({ id, nome, lat: +val('lg-lat') || 0, lon: +val('lg-lon') || 0, tz: val('lg-tz') || 'UTC' });
  store.setSettings({ preghiere: { luoghi: arr } }); renderImpostazioni(); toast('Luogo aggiunto');
}
function delLuogo(id) {
  const S = store.getSettings();
  const arr = S.preghiere.luoghi.filter(l => l.id !== id);
  const patch = { preghiere: { luoghi: arr } };
  if (S.preghiere.luogo_attivo === id) patch.preghiere.luogo_attivo = arr[0] ? arr[0].id : null;
  store.setSettings(patch); renderImpostazioni(); refreshOggi();
}
function setCorrezione(k, delta) {
  let v = (store.getSettings().preghiere.correzioni[k] || 0) + delta; v = Math.max(-30, Math.min(30, v));
  store.setSettings({ preghiere: { correzioni: { [k]: v } } }); renderImpostazioni(); refreshOggi();
}
function togglePreghiera(k) { store.setSettings({ preghiere: { mostra: { [k]: !store.getSettings().preghiere.mostra[k] } } }); renderImpostazioni(); refreshOggi(); }
/* ---- Visualizzazione ---- */
function toggleWidget(k) { store.setSettings({ vista: { widget: { [k]: !store.getSettings().vista.widget[k] } } }); renderImpostazioni(); refreshOggi(); }
function toggleSezione(k) { store.setSettings({ vista: { sezioni: { [k]: !(store.getSettings().vista.sezioni[k] !== false) } } }); renderImpostazioni(); applySezioni(); }
function toggleMomento(k) { store.setSettings({ vista: { momenti: { [k]: !(store.getSettings().vista.momenti[k] !== false) } } }); renderImpostazioni(); refreshOggi(); }
/* ---- Routine ---- */
function toggleAttiva(id) {
  const a = store.list('attivita').find(x => String(x.id) === String(id));
  store.updAttivita(id, { attiva: a.attiva === false });
  renderImpostazioni(); toast(a.attiva === false ? 'Riattivata' : 'Sospesa');
}
/* ---- Dati ---- */
function exportJSON() {
  const blob = new Blob([store.export()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'addukira-backup-' + store.today() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  toast('Backup scaricato');
}

function renderPage(p) {
  counts();
  if (p === 'azioni') { renderAzioni(); return; }
  if (p === 'impostazioni') renderImpostazioni();
  if (p === 'allah') renderAllah();
  if (p === 'oggi') renderOggi();
  if (p === 'lettura') renderLettura();
  if (p === 'memorizzazione') renderMemorizzazione();
  if (p === 'ascolto') renderAscolto();
  if (p === 'pensieri') renderPensieri();
  if (p === 'quran') renderQuran();
  if (p === 'hadith') renderHadith();
  if (p === 'people') renderPeople();
  if (p === 'stories') renderStories();
  if (p === 'themes') renderRaccolta('tema');
  if (p === 'segni_ora') renderRaccolta('segno_ora');
  if (p === 'creazione') renderRaccolta('creazione');
  if (p === 'luoghi') renderRaccolta('luogo');
  if (p === 'fiqh') renderRaccolta('fiqh');
}

/* ============================================================
   DETTAGLIO
   ============================================================ */
let backTo = 'oggi';                     /* da dove sono arrivato al dettaglio */

function openDetail(tipo, id) {
  let h = `<div class="reader"><div class="back" onclick="nav('${backTo}')">← Torna</div>`;
  if (tipo === 'versetto') {
    const v = store.get('versetti', id); const s = suraOf(v.sura_id);
    const pens = store.pensieriDi('versetto', id);
    const riv = s && s.rivelazione ? `<span class="riv ${esc(s.rivelazione)}">${s.rivelazione === 'meccana' ? '🕋 Meccana' : '🕌 Medinese'}</span>` : '';
    h += `<div class="eye">Corano · ${s ? s.numero + ' ' + s.translit : ''}</div>
    <h1 class="t">${s ? esc(s.titolo_it || s.translit) : ''} · ${v.numero}</h1>
    <div class="aya-meta">${riv}${s ? `<span class="riv n">${s.n_versetti} versetti</span><span class="riv n">${esc(s.nome_arabo)}</span>` : ''}</div>
    ${v.arabo ? `<div class="ayah">${esc(v.arabo)}<span class="numx">${s ? s.numero : ''}:${v.numero}</span></div>` : ''}
    <div class="trans">«${esc(v.traduzione)}»</div>
    <h2>Contesto e accadimenti</h2>
    ${v.contesto ? `<div class="body">${esc(v.contesto)}</div>` : '<div class="empty" style="padding:14px">Niente ancora. Qui andranno l’occasione della rivelazione e ciò che vi accade intorno.</div>'}
    ${v.nota ? `<div class="note-b"><div class="l">nota</div><div class="body" style="margin:0">${esc(v.nota)}</div></div>` : ''}
    <h2>Pensieri nati qui</h2>${pens.map(p => `<div class="note-b"><div class="l">${esc(p.data || 'pensiero')}</div><div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('') || '<div class="empty" style="padding:14px">Nessuno ancora.</div>'}
    <div class="think think-b">💭<input id="ay-pens" placeholder="Un pensiero su ${s ? s.numero : ''}:${v.numero}…">
      <button class="go" onclick="pensieroDaAya('${v.id}')">Salva</button></div>`;
  }
  if (tipo === 'hadith') {
    const x = store.get('hadith', id);
    h = `<div class="reader"><div class="back" onclick="nav('hadith')">← Torna</div>`;
    h += `<div class="eye">Hadith · ${esc(x.raccolta || '')}${x.numero_rif ? ' · ' + esc(x.numero_rif) : ''}</div>
    <h1 class="t">${esc(x.titolo || x.testo.slice(0, 58) + '…')}</h1>
    ${x.testo_ar ? `<div class="ayah">${esc(x.testo_ar)}</div>` : ''}
    <div class="trans">«${esc(x.testo)}»</div>
    <div class="src"><b>${GRADO[x.grado]}</b>${x.raccolta ? ' — ' + esc(x.raccolta) : ''}${x.isnad ? '<br>Isnād: ' + esc(x.isnad) : ''}</div>
    ${x.nota ? `<div class="note-b"><div class="l">nota</div><div class="body" style="margin:0">${esc(x.nota)}</div></div>` : ''}
    <div class="kh-btns">
      <button class="kh-b" onclick="openHadithEdit('${x.id}')">✎ Modifica</button>
      <button class="kh-b del" onclick="eliminaHadith('${x.id}')">🗑 Elimina</button></div>`;
    h += bloccoHadith(x);
  }
  if (tipo === 'personaggio') {
    const x = store.get('personaggi', id);
    h = `<div class="reader"><div class="back" onclick="nav('people')">← Torna</div>`;
    h += `<div class="eye">${CAT[x.categoria] || esc(x.categoria || '')}</div><h1 class="t">${esc(x.titolo)}</h1>
    ${x.arabo ? `<div class="ayah" style="font-size:22px;padding:16px 22px">${esc(x.arabo)}</div>` : ''}
    ${x.sommario ? `<div class="trans">${esc(x.sommario)}</div>` : ''}
    ${x.corpo ? `<div class="body">${esc(x.corpo)}</div>` : ''}
    ${x.riferimento ? `<div class="src">📚 ${esc(x.riferimento)}</div>` : ''}`;
    h += bloccoCollegamenti('personaggio', x.id);
    h += `<div class="kh-btns">
      <button class="kh-b" onclick="openVoceEdit('personaggio','${x.id}')">✎ Modifica</button>
      <button class="kh-b del" onclick="eliminaVoce('personaggio','${x.id}')">🗑 Elimina</button></div>`;
  }
  if (tipo === 'storia') {
    const x = store.get('storie', id);
    h = `<div class="reader"><div class="back" onclick="nav('stories')">← Torna</div>`;
    h += `<div class="eye">Storia · القصة</div><h1 class="t">${esc(x.titolo)}</h1>
    ${x.corpo ? `<div class="body">${esc(x.corpo)}</div>` : ''}
    ${x.riferimento ? `<div class="src">📚 ${esc(x.riferimento)}</div>` : ''}`;
    h += bloccoCollegamenti('storia', x.id);
    h += `<div class="kh-btns">
      <button class="kh-b" onclick="openVoceEdit('storia','${x.id}')">✎ Modifica</button>
      <button class="kh-b del" onclick="eliminaVoce('storia','${x.id}')">🗑 Elimina</button></div>`;
  }
  if (RACCOLTA_CFG[tipo]) {
    const cfg = RACCOLTA_CFG[tipo], nav0 = VOCE_CFG[tipo].pagina;
    const x = store.get(cfg.lista, id);
    h = `<div class="reader"><div class="back" onclick="nav('${nav0}')">← Torna</div>`;
    h += `<div class="eye">${esc(cfg.eye)}</div><h1 class="t">${esc(x.titolo)}</h1>
    ${x.corpo ? `<div class="trans">${esc(x.corpo)}</div>` : ''}`;
    h += bloccoRaccolta(tipo, x);
    h += `<div class="kh-btns">
      <button class="kh-b" onclick="openVoceEdit('${tipo}','${x.id}')">✎ Modifica</button>
      <button class="kh-b del" onclick="eliminaVoce('${tipo}','${x.id}')">🗑 Elimina</button></div>`;
  }
  h += '</div>'; $('#p-detail').innerHTML = h; show('detail');
}

/* ============================================================
   RICERCA
   ============================================================ */
function onSearch() {
  const q = $('#q').value.trim().toLowerCase();
  if (!q) { nav('oggi'); return; }
  const hits = [];
  store.list('versetti').forEach(v => { if ((v.traduzione + ' ' + (v.contesto || '')).toLowerCase().includes(q)) hits.push(vCard(v)); });
  store.list('hadith').forEach(x => { if ((x.testo + ' ' + (x.nota || '') + ' ' + (x.raccolta || '')).toLowerCase().includes(q)) hits.push(hCard(x)); });
  store.list('personaggi').forEach(x => { if (pesoPersonaggio(x).includes(senzaSegni(q))) hits.push(pCard(x)); });
  store.list('storie').forEach(x => { if (pesoStoria(x).includes(senzaSegni(q))) hits.push(sCard(x)); });
  store.list('temi').forEach(x => { if (senzaSegni([x.titolo, x.corpo].filter(Boolean).join(' ')).includes(senzaSegni(q))) hits.push(tCard(x)); });
  store.list('fiqh').forEach(x => { if (senzaSegni([x.titolo, x.corpo].filter(Boolean).join(' ')).includes(senzaSegni(q))) hits.push(fCard(x)); });
  store.list('adhkar').forEach(a => { if ((a.nome + ' ' + (a.traduzione || '')).toLowerCase().includes(q)) hits.push(`<div class="card"><span class="k">dhikr · ${a.momento.replace('_', ' ')}</span><h3>${esc(a.nome)}</h3><p>${esc(a.traduzione || '')}</p></div>`); });
  store.list('pensieri').forEach(p => { if (p.testo.toLowerCase().includes(q)) hits.push(`<div class="card" onclick="nav('pensieri')"><span class="k">pensiero</span><p>${esc(p.testo)}</p></div>`); });
  $('#p-search').innerHTML = head('Ricerca', `«${esc(q)}»`, hits.length + ' risultati.') + `<div class="grid">${hits.join('') || '<div class="empty">Nessun risultato.</div>'}</div>`;
  show('search');
}
const _q = $('#q'); if (_q) _q.oninput = onSearch;

/* ============================================================
   MODALE — nuova voce
   ============================================================ */
/* id della riga in modifica: null = si sta creando qualcosa di nuovo */
let mEditId = null;

function openModal() { mEditId = null; $('#veil').classList.add('on'); renderForm(); }
/* apre il modale già sul tipo giusto: si arriva qui dal pulsante di una pagina */
function openModalTipo(t) { $('#m-type').value = t; openModal(); }
function closeModal() { $('#veil').classList.remove('on'); mEditId = null; mModalMode(); }

/* intestazione e pulsante cambiano tra «nuovo» e «modifica» */
function mModalMode(titolo, bottone, sotto) {
  const h = $('#veil h2'), b = $('#btn-save'), s = $('#veil .s'), t = $('#m-type');
  if (h) h.textContent = titolo || 'Nuova voce';
  if (b) b.textContent = bottone || 'Salva';
  if (s) s.textContent = sotto || 'I campi rispecchiano le tabelle Supabase.';
  /* in modifica il tipo non si cambia: si sta correggendo quella riga lì */
  if (t) t.closest('.f').style.display = titolo ? 'none' : '';
}

/* ---- modifica di un hadith già scritto ---- */
function openHadithEdit(id) {
  const x = store.get('hadith', id);
  if (!x) { toast('Hadith non trovato'); return; }
  mEditId = null;
  $('#m-type').value = 'hadith';
  $('#veil').classList.add('on');
  renderForm();                       /* azzera fonti e tag, poi si riempie */
  mEditId = x.id;
  $('#f-titolo').value = x.titolo || '';
  $('#f-ar').value = x.testo_ar || '';
  $('#f-testo').value = x.testo || '';
  $('#f-grado').value = x.grado || 'sahih';
  $('#f-nota').value = x.nota || '';
  fonteRighe = fonteDaSalvato(x);
  renderFonti();
  linkBoxInit('m', store.ancoreDiCosa('hadith', x.id).map(a => ({ tipo: a.tipo, id: a.target })),
    { escludi: ['hadith'], vuoto: M_VUOTO });
  tagBoxInit('m', store.tagsDi(x.id, 'hadith'));
  mModalMode('Modifica l’hadith', 'Salva le modifiche', 'Correggi ciò che serve: fonti, tag, grado, testo.');
}

/* Ricostruisce le righe fonte+riferimento da come sono state salvate.
   `numero_rif` è nella forma «Bukhārī 5812 · Muslim 2079»: ogni pezzo
   comincia col nome di una fonte nota, il resto è il riferimento. */
function fonteDaSalvato(x) {
  const nomi = store.fontiDiTipo().map(f => f.nome).sort((a, b) => b.length - a.length);
  const pezzi = String(x.numero_rif || '').split('·').map(s => s.trim()).filter(Boolean);
  const righe = pezzi.map(p => {
    const n = nomi.find(nome => p === nome || p.startsWith(nome + ' '));
    return n ? { fonte: n, rif: p.slice(n.length).trim() } : { fonte: '', rif: p };
  });
  /* se il riferimento non diceva niente, si guarda almeno l'elenco delle raccolte */
  if (!righe.length) {
    const dalle = String(x.raccolta || '').split(/,| e /).map(s => s.trim()).filter(Boolean);
    dalle.forEach(n => righe.push({ fonte: nomi.includes(n) ? n : '', rif: '' }));
  }
  return righe.length ? righe : [{ fonte: '', rif: '' }];
}

/* ============================================================
   SCHEDE DI STUDIO — creare, correggere, togliere.
   Vivono tutte nella tabella `voci`: cambia solo quali campi del form
   finiscono in quali colonne. Una riga di configurazione per tipo, e
   il resto (modale, collegamenti, tag, salvataggio) è in comune.
   ============================================================ */
const VOCE_CFG = {
  personaggio: {
    lista: 'personaggi', pagina: 'people', nome: 'il personaggio', serve: 'f-nome', mancante: 'Serve il nome',
    campi: { 'f-nome': 'titolo', 'f-arn': 'arabo', 'f-cat': 'categoria',
             'f-somm': 'sommario', 'f-bio': 'corpo', 'f-rif': 'riferimento' },
    vuoto: 'Nessun collegamento. Quale hadith lo riporta? In quale storia compare?',
  },
  storia: {
    lista: 'storie', pagina: 'stories', nome: 'la storia', serve: 'f-titolo', mancante: 'Serve il titolo',
    campi: { 'f-titolo': 'titolo', 'f-testo': 'corpo', 'f-rif': 'riferimento' },
    vuoto: 'Nessun collegamento. In quale sura è raccontata? Chi vi compare?',
  },
  /* Il tema si scrive una volta e non si tocca più: nome e concetto, basta.
     Non ha né collegamenti né tag propri, perché è lui il punto di raccolta —
     sono le altre schede che, nel tempo, si agganciano a lui. */
  tema: {
    lista: 'temi', pagina: 'themes', nome: 'il tema', serve: 'f-nome', mancante: 'Serve il nome del tema',
    campi: { 'f-nome': 'titolo', 'f-desc': 'corpo' },
    senzaLink: true, senzaTag: true,
  },
  /* Per ora identico al tema: gli argomenti di fiqh sono tanti, si scrivono
     e basta. La struttura vera (gerarchia, scuole) si vedrà dopo. */
  fiqh: {
    lista: 'fiqh', pagina: 'fiqh', nome: "l'argomento", serve: 'f-nome', mancante: "Serve il nome dell'argomento",
    campi: { 'f-nome': 'titolo', 'f-desc': 'corpo' },
    senzaLink: true, senzaTag: true,
  },
  segno_ora: {
    lista: 'segni_ora', pagina: 'segni_ora', nome: 'il segno', serve: 'f-nome', mancante: 'Serve il nome del segno',
    campi: { 'f-nome': 'titolo', 'f-desc': 'corpo' },
    senzaLink: true, senzaTag: true,
  },
  creazione: {
    lista: 'creazione', pagina: 'creazione', nome: 'la voce', serve: 'f-nome', mancante: 'Serve il nome della voce',
    campi: { 'f-nome': 'titolo', 'f-desc': 'corpo' },
    senzaLink: true, senzaTag: true,
  },
  luogo: {
    lista: 'luoghi', pagina: 'luoghi', nome: 'il luogo', serve: 'f-nome', mancante: 'Serve il nome del luogo',
    campi: { 'f-nome': 'titolo', 'f-desc': 'corpo' },
    senzaLink: true, senzaTag: true,
  },
  /* L'azione invece i collegamenti li ha eccome: sono il suo «perché» */
  azione: {
    lista: 'azioni', pagina: 'azioni', nome: "l'azione", serve: 'f-nome', mancante: "Serve il nome dell'azione",
    campi: { 'f-nome': 'titolo', 'f-cat': 'categoria', 'f-desc': 'corpo' },
    vuoto: "Nessun collegamento. Quale hadith la fonda? Quale passo del Corano? Quale storia?",
    cadenze: true,
  },
};

/* riempie il modale di una scheda già scritta */
function openVoceEdit(tipo, id) {
  const cfg = VOCE_CFG[tipo]; if (!cfg) return;
  const x = store.get(cfg.lista, id);
  if (!x) { toast('Scheda non trovata'); return; }
  mEditId = null;
  $('#m-type').value = tipo;
  $('#veil').classList.add('on');
  renderForm();                       /* azzera collegamenti e tag, poi si riempie */
  mEditId = x.id;
  for (const campo in cfg.campi) {
    const el = document.getElementById(campo);
    if (el) el.value = x[cfg.campi[campo]] || '';
  }
  linkBoxInit('m', cfg.senzaLink ? [] : store.ancoreDiCosa(tipo, x.id).map(a => ({ tipo: a.tipo, id: a.target })),
    { escludi: [tipo], vuoto: cfg.vuoto });
  tagBoxInit('m', cfg.senzaTag ? [] : store.tagsDi(x.id, tipo));
  if (cfg.cadenze) tagBoxInit('mc', store.tagsDi(x.id, tipo, 'cadenza'));
  mModalMode('Modifica ' + cfg.nome, 'Salva le modifiche', 'Correggi ciò che serve.');
}

/* il salvataggio, uguale per tutte: campi → collegamenti → tag */
function salvaVoce(tipo) {
  const cfg = VOCE_CFG[tipo];
  if (!val(cfg.serve)) { toast(cfg.mancante); return; }
  const campi = {};
  for (const campo in cfg.campi) campi[cfg.campi[campo]] = val(campo);
  const id = mEditId;
  if (id) store.editVoce(id, campi);
  const voce = id ? store.get(cfg.lista, id) : store.add(cfg.lista, campi);
  /* i tipi senza casella non devono passare di qui: scriverebbero una lista
     vuota e cancellerebbero tutto quello che si è agganciato nel tempo */
  if (!cfg.senzaLink) store.setAncoreDiCosa(tipo, voce.id, linkValori('m'), LINK_GESTITI());
  if (!cfg.senzaTag) store.setTags(voce.id, tagBoxValori('m'), tipo);
  if (cfg.cadenze) store.setTags(voce.id, tagBoxValori('mc'), tipo, 'cadenza');
  closeModal(); counts();
  toast(id ? 'Scheda aggiornata ✓' : 'Scheda salvata ✓');
  if (id) openDetail(tipo, voce.id); else nav(cfg.pagina);
}

function eliminaVoce(tipo, id) {
  const cfg = VOCE_CFG[tipo]; if (!cfg) return;
  const x = store.get(cfg.lista, id);
  if (!x) return;
  if (!confirm(`Eliminare «${x.titolo}»? Spariscono anche i suoi tag e i collegamenti.`)) return;
  store.delVoce(id);
  counts(); nav(cfg.pagina);
  toast('Scheda eliminata');
}

function eliminaHadith(id) {
  const x = store.get('hadith', id);
  if (!x) return;
  const nome = x.titolo || x.testo.slice(0, 40) + '…';
  if (!confirm(`Eliminare «${nome}»? Spariscono anche i suoi tag e i collegamenti a personaggi e azioni.`)) return;
  store.delHadith(id);
  counts(); nav('hadith');
  toast('Hadith eliminato');
}
const _bn = $('#btn-new'); if (_bn) _bn.onclick = openModal;
$('#btn-cancel').onclick = closeModal;
$('#btn-save').onclick = saveEntry;
$('#m-type').onchange = renderForm;
$('#veil').onclick = e => { if (e.target === $('#veil')) closeModal(); };

/* modale aggiungi pensiero */
$('#pt-cancel').onclick = closePensieroModal;
$('#pt-save').onclick = savePensiero;
$('#veil-pensiero').onclick = e => { if (e.target === $('#veil-pensiero')) closePensieroModal(); };
/* I tag sono testo libero: passarli dentro un onclick sarebbe un guaio con
   apostrofi e virgolette. Si ascolta il clic da qui, si legge l'attributo, e
   il prefisso della casella si ricava dal blocco che contiene il bersaglio —
   così lo stesso ascoltatore serve tutti i modali. */
document.addEventListener('click', e => {
  const bers = e.target.closest('[data-tagx], [data-tagadd]');
  if (!bers) return;
  const cassetta = bers.closest('[data-tagbox]');
  if (!cassetta) return;
  const pre = cassetta.dataset.tagbox;
  if (bers.dataset.tagx !== undefined) tagBoxDel(pre, bers.dataset.tagx);
  else tagBoxAdd(pre, bers.dataset.tagadd);
});
$('#p-pensieri').addEventListener('click', e => {
  const t = e.target.closest('[data-tag]');
  if (t) pfTagToggle(t.dataset.tag);
});
$('#p-hadith').addEventListener('click', e => {
  const t = e.target.closest('[data-htag]');
  if (t) hsTagToggle(t.dataset.htag);
});
$('#p-people').addEventListener('click', e => {
  const t = e.target.closest('[data-ptag]');
  if (t) peTagToggle(t.dataset.ptag);
});
$('#p-stories').addEventListener('click', e => {
  const t = e.target.closest('[data-stag]');
  if (t) stTagToggle(t.dataset.stag);
});
$('#p-azioni').addEventListener('click', e => {
  const t = e.target.closest('[data-atag]');
  if (t) { azTagToggle(t.dataset.atag); return; }
  const c = e.target.closest('[data-acad]');
  if (c) azCadToggle(c.dataset.acad);
});

/* pannello attività */
$('#att-cancel').onclick = closeAttivita;
$('#att-save').onclick = salvaAttivita;
$('#veil-att').onclick = e => { if (e.target === $('#veil-att')) closeAttivita(); };

/* popup completamento khatam */
$('#kh-close').onclick = closeKhatamComplete;
$('#kh-save').onclick = saveKhatamThought;
$('#veil-khatam').onclick = e => { if (e.target === $('#veil-khatam')) closeKhatamComplete(); };

function fld(id, label, type = 'input', attrs = '') {
  return `<div class="f"><label>${label}</label>${type === 'textarea' ? `<textarea id="${id}" ${attrs}></textarea>` : type === 'select' ? `<select id="${id}">${attrs}</select>` : `<input id="${id}" ${attrs}>`}</div>`;
}
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };

/* i due blocchi che ogni scheda si porta dietro: collegamenti e tag */
const BLOCCO_LINK = `<div class="f"><label>Collegato a <span class="lbl-hint">puoi sceglierne più di uno per tipo</span></label>
    <div class="chips" id="m-tipi"></div></div>
  <div id="m-quali"></div>`;
const BLOCCO_TAG = (esempi, pre, etichetta) => {
  pre = pre || 'm';
  return `<div class="f" data-tagbox="${pre}"><label>${esc(etichetta || 'Tag')} <span class="lbl-hint">parole tue — scrivi e premi Invio</span></label>
    <input id="${pre}-tag-in" class="pick-in" autocomplete="off" placeholder="${esc(esempi)}"
      oninput="tagBoxSugg('${pre}')" onkeydown="tagBoxTasti('${pre}',event)">
    <div class="pick-hits" id="${pre}-tag-sugg"></div>
    <div class="chips" id="${pre}-tags"></div></div>`;
};
/* i tipi di collegamento che questi modali sanno maneggiare */
const LINK_GESTITI = () => Object.keys(ANCORE);

function renderForm() {
  const t = $('#m-type').value; const F = $('#m-fields');
  const suraOpts = store.list('sure').map(s => `<option value="${s.id}">${s.numero} · ${s.translit}</option>`).join('');
  const vOpts = '<option value="">—</option>' + store.list('versetti').map(v => { const s = suraOf(v.sura_id); return `<option value="${v.id}">${s ? s.numero : ''}:${v.numero}</option>`; }).join('');
  const hOpts = '<option value="">—</option>' + store.list('hadith').map(x => `<option value="${x.id}">${esc(x.numero_rif)}</option>`).join('');
  if (t === 'pensiero') F.innerHTML = fld('f-testo', 'Il pensiero', 'textarea') + `<div class="row2">${fld('f-anct', 'Nato da…', 'select', '<option value="">la giornata</option><option value="versetto">un versetto</option><option value="hadith">un hadith</option>')}${fld('f-anci', 'Quale', 'select', vOpts)}</div>`;
  if (t === 'adhkar') F.innerHTML = fld('f-nome', 'Nome') + `<div class="row2">${fld('f-mom', 'Momento', 'select', store.momenti.map(m => `<option value="${m.k}">${m.t}</option>`).join(''))}${fld('f-ora', 'Orario fisso (facolt.)', 'input', 'type="time"')}</div>` + fld('f-rip', 'Ripetizioni (facolt.)', 'input', 'placeholder="33×3, 1–14…"') + fld('f-ar', 'Arabo (facolt.)', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione (facolt.)', 'textarea') + `<div class="row2">${fld('f-v', 'Versetto che ne parla', 'select', vOpts)}${fld('f-h', 'Hadith che lo conferma', 'select', hOpts)}</div>`;
  if (t === 'versetto') F.innerHTML = fld('f-sura', 'Sura', 'select', suraOpts) + fld('f-num', 'Numero aya', 'input', 'type="number"') + fld('f-ar', 'Arabo', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione', 'textarea') + fld('f-ctx', 'Contesto (facolt.)', 'textarea');
  if (t === 'hadith') F.innerHTML = fld('f-titolo', 'Titolo (come lo richiami)') + fld('f-ar', 'Testo arabo (facolt.)', 'textarea', 'class="ar-in"') + fld('f-testo', 'Testo italiano', 'textarea')
    + `<div class="f"><label>Fonte e riferimento <span class="lbl-hint">un hadith può stare in più raccolte</span></label>
        <div id="f-fonti"></div>
        <button type="button" class="kh-b" onclick="fonteRigaAdd()">＋ Aggiungi fonte</button></div>`
    + fld('f-grado', 'Grado', 'select', '<option value="sahih">🟢 Sahih</option><option value="hasan">Hasan</option><option value="daif">Daif</option><option value="qudsi">Qudsi</option><option value="non_verificato">Da verificare</option>') + fld('f-nota', 'Nota (facolt.)', 'textarea')
    + BLOCCO_LINK + BLOCCO_TAG('abbigliamento, bambini, ṣabr…');
  if (t === 'personaggio') F.innerHTML = `<div class="row2">${fld('f-nome', 'Nome')}${fld('f-arn', 'Nome arabo', 'input', 'class="ar-in"')}</div>`
    + fld('f-cat', 'Categoria', 'select', Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''))
    + fld('f-somm', 'In una riga', 'input', 'placeholder="Come lo riassumeresti: «Il servitore del Profeta ﷺ per dieci anni»"')
    + fld('f-bio', 'Biografia', 'textarea')
    + fld('f-rif', 'Fonte (facolt.)', 'input', 'placeholder="Dove l’hai letto"')
    + BLOCCO_LINK + BLOCCO_TAG('nome, tribù, virtù…');
  if (t === 'storia') F.innerHTML = fld('f-titolo', 'Titolo della storia')
    + fld('f-testo', 'Il racconto', 'textarea')
    + fld('f-rif', 'Fonte (facolt.)', 'input', 'placeholder="Sura, hadith, opera da cui viene"')
    + BLOCCO_LINK + BLOCCO_TAG('profeti, pazienza, prova…');
  if (t === 'azione') F.innerHTML = fld('f-nome', "Nome dell'azione", 'input', 'placeholder="Dire il tasbīḥ dopo la ṣalāt…"')
    + fld('f-cat', 'Categoria', 'select', Object.entries(AZ_CATS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''))
    + fld('f-desc', "In cosa consiste", 'textarea', 'placeholder="Come si fa, quando, con che intenzione."')
    + BLOCCO_LINK + BLOCCO_TAG('lingua, cuore, purificazione…')
    + BLOCCO_TAG('ogni giorno, dopo ogni ṣalāt, il venerdì…', 'mc', 'Cadenza');
  /* le schede-raccolta hanno tutte lo stesso form: un nome e un concetto */
  if (RACCOLTA_CFG[t]) F.innerHTML = fld('f-nome', 'Nome', 'input', `placeholder="${esc(RACCOLTA_CFG[t].cerca)}"`)
    + fld('f-desc', 'Il concetto', 'textarea', 'placeholder="Che cos’è, in poche righe. Quello che vi si collegherà nel tempo arriva da solo."');
  if (t === 'hadith') {
    fonteRighe = [{ fonte: '', rif: '' }]; renderFonti();
    linkBoxInit('m', [], { escludi: ['hadith'], vuoto: M_VUOTO });
    tagBoxInit('m', []);
  }
  /* ogni scheda di studio si porta dietro collegamenti e tag, sempre uguali.
     Si azzerano comunque, anche per chi non li mostra: così lo stato del
     modale precedente non resta appeso. */
  if (VOCE_CFG[t]) {
    linkBoxInit('m', [], { escludi: [t], vuoto: VOCE_CFG[t].vuoto });
    tagBoxInit('m', []);
    if (VOCE_CFG[t].cadenze) tagBoxInit('mc', []);
  }
}
const M_VUOTO = 'Nessun collegamento. Chi lo riporta? Quale azione ne nasce? Di quale tema parla?';

/* ---- fonte e riferimento, a coppie ----
   Un hadith sta spesso in più raccolte: «Bukhārī 5812 · Muslim 2079».
   In tabella restano le due colonne di sempre, `raccolta` e `numero_rif`:
   qui le coppie vengono composte in quella forma, la stessa che usavi già
   a mano. Nessuna colonna nuova. */
let fonteRighe = [{ fonte: '', rif: '' }];

function renderFonti() {
  const box = $('#f-fonti'); if (!box) return;
  const raccolte = store.fontiDiTipo('raccolta');
  if (!raccolte.length) {
    box.innerHTML = `<div class="set-info">Non hai ancora nessuna fonte.
      Creale in <b onclick="nav('impostazioni')" style="cursor:pointer;text-decoration:underline">Impostazioni → Fonti</b>: poi le peschi da qui senza riscriverle.</div>`;
    return;
  }
  box.innerHTML = fonteRighe.map((r, i) => `<div class="fonte-riga">
    <select onchange="fonteSet(${i},'fonte',this.value)">
      <option value="">— scegli la fonte —</option>
      ${raccolte.map(f => `<option value="${esc(f.nome)}" ${f.nome === r.fonte ? 'selected' : ''}>${esc(f.nome)}${f.nota ? ' · ' + esc(f.nota) : ''}</option>`).join('')}
    </select>
    <input placeholder="Riferimento — 5812" value="${esc(r.rif)}" oninput="fonteSet(${i},'rif',this.value)">
    <button type="button" class="tb no" title="Togli questa fonte" onclick="fonteRigaDel(${i})"
      ${fonteRighe.length > 1 ? '' : 'disabled'}>✕</button>
  </div>`).join('');
}
function fonteSet(i, campo, v) { if (fonteRighe[i]) fonteRighe[i][campo] = v; }
function fonteRigaAdd() { fonteRighe.push({ fonte: '', rif: '' }); renderFonti(); }
function fonteRigaDel(i) { fonteRighe.splice(i, 1); if (!fonteRighe.length) fonteRighe = [{ fonte: '', rif: '' }]; renderFonti(); }

/* «Bukhārī» + 5812 e «Muslim» + 2079 diventano
   raccolta: "Bukhārī e Muslim" · riferimento: "Bukhārī 5812 · Muslim 2079" */
function fonteComposta() {
  const righe = fonteRighe.map(r => ({ fonte: String(r.fonte || '').trim(), rif: String(r.rif || '').trim() }))
    .filter(r => r.fonte || r.rif);
  const nomi = righe.map(r => r.fonte).filter(Boolean);
  const raccolta = nomi.length <= 1 ? (nomi[0] || '')
    : nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1];
  const numero_rif = righe.map(r => [r.fonte, r.rif].filter(Boolean).join(' ')).join(' · ');
  /* la prima raccolta scelta va anche nella colonna `fonte_id`: è il legame
     vero verso la tabella delle fonti, quello che un giorno reggerà le query */
  const prima = store.fontiDiTipo().find(f => f.nome === nomi[0]);
  return { raccolta, numero_rif, fonte_id: prima ? prima.id : null };
}

function saveEntry() {
  const t = $('#m-type').value;
  if (t === 'pensiero') { if (!val('f-testo')) { toast('Scrivi il pensiero'); return; } store.addPensiero(val('f-testo'), val('f-anct') && val('f-anci') ? [{ tipo: val('f-anct'), id: val('f-anci') }] : []); }
  if (t === 'adhkar') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('adhkar', { nome: val('f-nome'), momento: val('f-mom'), ora: val('f-ora'), rip: val('f-rip'), arabo: val('f-ar'), traduzione: val('f-tr'), versetto_id: val('f-v') ? +val('f-v') : null, hadith_id: val('f-h') ? +val('f-h') : null }); }
  if (t === 'versetto') { if (!val('f-tr')) { toast('Serve la traduzione'); return; } store.add('versetti', { sura_id: +val('f-sura'), numero: +val('f-num') || 0, arabo: val('f-ar'), traduzione: val('f-tr'), contesto: val('f-ctx'), nota: '' }); }
  if (t === 'hadith') {
    if (!val('f-testo')) { toast('Serve il testo'); return; }
    const F = fonteComposta();
    const campi = { titolo: val('f-titolo'), testo: val('f-testo'), testo_ar: val('f-ar'),
      raccolta: F.raccolta, numero_rif: F.numero_rif, fonte_id: F.fonte_id,
      grado: val('f-grado'), nota: val('f-nota') };
    if (mEditId) {
      const id = mEditId;
      store.editHadith(id, campi);
      store.setAncoreDiCosa('hadith', id, linkValori('m'), LINK_GESTITI());
      store.setTags(id, tagBoxValori('m'), 'hadith');
      closeModal(); toast('Hadith aggiornato ✓');
      openDetail('hadith', id);        /* si torna dov'eri, con le correzioni */
      return;
    }
    const h = store.add('hadith', Object.assign({ narratore_id: null, isnad: '' }, campi));
    store.setAncoreDiCosa('hadith', h.id, linkValori('m'), LINK_GESTITI());
    store.setTags(h.id, tagBoxValori('m'), 'hadith');
  }
  if (VOCE_CFG[t]) { salvaVoce(t); return; }
  if (t === 'tema') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('temi', { nome: val('f-nome'), nome_arabo: val('f-arn'), descrizione: val('f-desc') }); }
  closeModal(); toast('Voce salvata ✓');
  const on = document.querySelector('.lnk.on'); renderPage(on ? on.dataset.p : 'oggi');
}

/* ---- lingua IT / AR ---- */
document.querySelectorAll('[data-lang-btn]').forEach(b => {
  b.onclick = () => {
    store.setLang(b.getAttribute('data-lang-btn'));
    applyI18n();
    const on = document.querySelector('.lnk.on');
    renderPage(on ? on.dataset.p : 'oggi');   /* ri-render pagina corrente nella nuova lingua */
  };
});

/* ---- avvio ----
   Non parte da solo: aspetta che Auth confermi la sessione e che lo store
   abbia caricato da Supabase. Lo fa `window.onLoggato` in index.html. */
function avviaApp() {
  renderPage('oggi'); counts(); applyI18n(); applySezioni();
}
window.avviaApp = avviaApp;

/* PWA: registra il service worker se servita via http(s) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
