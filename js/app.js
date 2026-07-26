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
const PAGES = ['oggi', 'lettura', 'memorizzazione', 'pensieri', 'allah', 'quran', 'hadith', 'people', 'stories', 'themes', 'fiqh', 'azioni', 'segni_ora', 'creazione', 'luoghi', 'impostazioni', 'search', 'detail'];
function show(p) { PAGES.forEach(x => $('#p-' + x).classList.remove('on')); $('#p-' + p).classList.add('on'); window.scrollTo(0, 0); }
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

  /* La mia giornata */
  const momAttivi = store.getSettings().vista.momenti;
  let html = `<div class="hd">La mia giornata</div>`;

  store.momenti.forEach(m => {
    if (!momAttivi[m.k]) return;
    if (m.k === 'lettura') {
      const L = store.lettura(); const s = suraOf(L.sura_id);
      const pos = L.attivo
        ? `sei a ${s ? s.translit : ''} ${s ? s.numero : ''}:${L.aya || 'inizio'}`
        : 'nessun khatam in corso';
      html += `<div class="momento"><div class="mo-t"><span class="ico">${m.ico}</span>${m.t} <span class="st">${L.attivo ? 'riprendi' : 'inizia'}</span></div>
      <div class="task" style="cursor:pointer" onclick="nav('lettura')"><div class="chk"></div><div class="b">
      <div class="nm">Corano — ${pos} <span class="rep">khatam ${L.khatam} · ${L.pct}%</span></div>
      <div class="tr">${L.attivo ? 'Tocca per riprendere da dove eri.' : 'Tocca per avviare una nuova lettura.'}</div></div></div></div>`;
      return;
    }
    const items = store.attivitaOggi().filter(a => a.momento === m.k);
    if (!items.length) return;
    const stati = items.map(a => store.statoEff(a));
    const done = stati.filter(s => s === 'fatto').length;
    const skip = stati.filter(s => s === 'saltato' || s === 'auto').length;
    const cont = `${done} di ${items.length}` + (skip ? ` · ${skip} saltat${skip === 1 ? 'a' : 'e'}` : '');
    html += `<div class="momento"><div class="mo-t"><span class="ico">${m.ico}</span>${m.t} <span class="st">${cont}</span></div>`;
    items.forEach((a, i) => {
      const st = stati[i];
      const ev = a.verso === 'evitare';
      const cls = st === 'fatto' ? 'done' : (st ? 'skip' : '');
      const dh = a.adhkar_id ? store.get('adhkar', a.adhkar_id) : null;   /* testo canonico */
      const az = a.azione_id ? store.get('azioni', a.azione_id) : null;   /* da dove nasce */
      const oraL = store.oraLabel(a);
      html += `<div class="task ${cls} ${ev ? 'ev' : ''}">
        <div class="b"><div class="nm">${esc(a.nome)}
          ${ev ? '<span class="vs-ev">da evitare</span>' : ''}
          ${a.ripetizioni ? `<span class="rep">${esc(a.ripetizioni)}</span>` : ''}
          ${oraL ? `<span class="oral">${esc(oraL)}</span>` : ''}
          ${st === 'auto' ? `<span class="skipped">saltata — orario passato</span>` : ''}
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
    html += '</div>';
  });
  $('#oggi-giornata').innerHTML = html;
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
function renderLettura() {
  const L = store.lettura();
  const active = store.activeKhatam();
  /* Il segnalibro vive su khatam.aya_id come indice globale 1–6236: va confrontato
     con quello. Su `active` non esistono sura_id/aya — chi li leggeva otteneva
     undefined, e il segnalibro non si accendeva mai. */
  const bmIdx = active ? (active.aya_id || 0) : 0;
  const done = store.khatamDone();
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

  /* --- due modi di leggere lo stesso testo --- */
  const modo = (store.getSettings().vista.lettore) || 'flusso';
  html += `<div class="lettore-tab">
    <span class="chip ${modo === 'flusso' ? 'sel' : ''}" onclick="setLettore('flusso')">📜 Flusso</span>
    <span class="chip ${modo === 'pagina' ? 'sel' : ''}" onclick="setLettore('pagina')">📖 Pagina</span>
  </div>`;
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
    html += `<div class="aya-row ${isHl ? 'hl' : ''}"><div class="num">${v.aya}</div>
    <div class="tx"><div class="arq">${esc(v.arabo)}</div><div class="itq">${esc(v.it)}</div></div>
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
    let cls = '', click, tit;
    if (mem) {
      const m = store.isMem(v.sura_id, v.aya);
      if (m) nMem++;
      cls = m ? 'mem' : '';
      click = `store.toggleMem(${v.sura_id},${v.aya});renderMemorizzazione()`;
      tit = `${s.numero}:${v.aya} — ${m ? 'memorizzato: tocca per togliere' : 'tocca quando lo sai'}`;
    } else {
      const bm = cfg.bmIdx > 0 && store.idxDi(s.numero, v.aya) === cfg.bmIdx;
      cls = (store.isHl(v.sura_id, v.aya) ? 'hl ' : '') + (bm ? 'bm' : '');
      click = `apriAya(${v.sura_id},${v.aya})`;
      tit = `${s.numero}:${v.aya} — apri la scheda`;
    }
    h += `<span class="mv ${cls}" ${mem ? `onclick="${click}" title="${tit}"` : ''}>${esc(v.arabo)}</span><span class="mv-n" title="${tit}" onclick="${click}">۝${cifreArabe(v.aya)}</span> `;
  });
  if (aperto) h += `</div><div class="mushaf-foot">${lastPag(lastSura)}</div></div>`;

  if (mem) h = `<div class="mem-conta">${nMem} di ${nTot} versetti memorizzati qui · tocca il testo per segnarlo</div>` + h;

  h += `<div class="mushaf-note">La vera impaginazione del muṣḥaf — 604 pagine, ognuna che finisce
    sempre dove deve — arriva con l'import: serve <b>ayat.pagina</b>, che dice quale versetto sta su
    quale pagina. Da allora questa vista mostrerà una pagina per volta${mem
      ? ' — ed è quella la forma che conta per la ḥifẓ: si memorizza la <b>posizione</b> sulla pagina, non solo le parole' : ', e i colori del tajwīd'}.</div>`;
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
  const y = window.scrollY;                 /* i nuovi versetti si aggiungono in coda */
  const n = await store.caricaAncora();
  lpInCorso = false;
  if (!n) { if (btn) { btn.textContent = 'Niente altro'; } return; }
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

function renderMemorizzazione() {
  const st = store.studio();
  const S = store.statMem();
  const P = S.piano;
  const [ps, pe] = ottavaPages(st.hizb, st.ottava);

  let html = dayHeader('Memorizzazione');

  if (!P) {
    /* --- nessun piano: si sceglie COSA e IN QUANTO TEMPO. Uno solo alla volta. --- */
    if (!mzDraft.fine) mzDraft.fine = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    const U = store.unitaMem, u = U[mzDraft.tipo] || U.corano;
    const arg = u.selezione ? mzDraft.sure : mzDraft.n;
    const ayat = store.ayatObiettivo(mzDraft.tipo, arg);
    const gg = Math.max(1, Math.round((new Date(mzDraft.fine + 'T12:00:00') - new Date(store.today() + 'T12:00:00')) / 86400000) + 1);
    const alGiorno = Math.ceil(ayat / gg);

    html += `<div class="khatam-panel"><div class="kh-row">
      <div class="kh-count"><div class="n">${S.pctCorano}%</div><div class="l">memorizzato<br>del Corano</div></div>
      <div class="kh-active">
        <div class="kh-lab">Nessun piano in corso</div>
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
      </div></div></div>`;

    /* sospesi e completati, come in Lettura */
    const sosp = store.pianiMemSospesi();
    if (sosp.length) {
      html += `<div class="hd">Sospesi</div>` + sosp.map(p => `<div class="att-row">
        <div class="ar-b"><div class="ar-n">Piano del ${esc(p.inizio)}</div>
        <div class="ar-m">obiettivo entro ${esc(p.fine)} · era partito da ${p.base} versetti</div></div>
        <button class="kh-b start" onclick="store.resumePianoMem('${p.id}');renderMemorizzazione();toast('Piano ripreso')">▶ Riprendi</button>
        <button class="tb no" onclick="if(confirm('Eliminare questo piano?')){store.delPianoMem('${p.id}');renderMemorizzazione()}">✕</button>
      </div>`).join('');
    }
    $('#p-memorizzazione').innerHTML = html;
    return;
  }

  /* --- piano in corso: il pannello diventa analisi del proprio operato --- */
  const avanti = P.scarto >= 0;
  html += `<div class="khatam-panel"><div class="kh-row">
    <div class="kh-count"><div class="n">${S.pctCorano}%</div><div class="l">memorizzato<br>del Corano</div></div>
    <div class="kh-active">
      <div class="kh-lab">Piano in corso · giorno ${P.giorno} di ${P.totGiorni}</div>
      <div class="kh-pos"><b>${esc(P.obiettivoLabel)}</b><br>
        ${P.alGiorno} al giorno per finire entro il ${esc(P.fine)}${P.giorniRimasti ? ` · ${P.giorniRimasti} giorni rimasti` : ''}
        <span class="mz-done">${P.fatteObiettivo} di ${P.obiettivo} fatti</span></div>
      <div class="prog prog2"><i class="reale" style="width:${Math.min(100, P.pctObiettivo)}%"></i>
        <span class="tacca" style="left:${Math.min(100, P.pctTempo)}%" title="dove dovresti essere"></span></div>
      <div class="kh-btns">
        <button class="kh-b stop" onclick="store.stopPianoMem();renderMemorizzazione();toast('Piano sospeso')">⏸ Sospendi</button>
        <button class="kh-b del" onclick="if(confirm('Eliminare il piano? I versetti memorizzati restano.')){store.delPianoMem('${P.id}');renderMemorizzazione()}">🗑 Elimina</button>
      </div>
    </div></div></div>`;

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
    <span class="chip ${mzModo === 'lista' ? 'sel' : ''}" onclick="setMemVista('lista')">☑ Lista</span>
  </div>`;

  if (mzModo === 'pagina') {
    html += renderMushaf({ modo: 'memoria' });
  } else {
    html += store.list('ayat_demo').map(v => {
      const s = suraOf(v.sura_id); const isM = store.isMem(v.sura_id, v.aya);
      return `<div class="mz-aya ${isM ? 'mem' : ''}">
        <button class="mz-chk" title="Segna come memorizzato" onclick="store.toggleMem(${v.sura_id},${v.aya});renderMemorizzazione()">${isM ? '✓' : ''}</button>
        <div class="mz-num">${s ? s.numero : ''}:${v.aya}</div>
        <div class="mz-ar">${esc(v.arabo)}</div></div>`;
    }).join('');
  }

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
  personaggio: { ico: '👤', l: 'Personaggio', t: 'personaggi', txt: p => p.nome,   go: id => `openDetail('personaggio','${id}')` },
  tema:        { ico: '🧵', l: 'Tema',        t: 'temi',       txt: x => x.nome,   go: id => `openDetail('tema','${id}')` },
  storia:      { ico: '🏜️', l: 'Storia',      t: 'storie',     txt: x => x.titolo, go: id => `openDetail('storia','${id}')` },
  azione:      { ico: '⚖️', l: 'Azione',      t: 'azioni',     txt: x => x.titolo, go: id => `openStudioDetail('azioni','${id}')` },
  asma:        { ico: 'ﷲ',  l: 'Nome di Allah', t: 'asma',    txt: x => `${x.translit} · ${x.significato}`, go: id => `openAsmaDetail('${id}')` },
};

/* tutte le ancore di un pensiero, pronte da mostrare */
function anchorLabels(p) {
  const out = store.ancoreDi(p.id).map(a => {
    const cfg = ANCORE[a.tipo]; if (!cfg) return null;
    const rec = store.get(cfg.t, a.target); if (!rec) return null;
    return { txt: `${cfg.ico} ${esc(String(cfg.txt(rec) || ''))}`, onclick: cfg.go(a.target) };
  }).filter(Boolean);
  return out.length ? out : [{ txt: '☀️ nato dalla giornata', onclick: '' }];
}

/* bozza del piano prima dell'avvio: cosa, quanto, entro quando */
let mzDraft = { tipo: 'corano', n: 1, sure: [], fine: '' };
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
  store.newPianoMem(fine, mzDraft.tipo, sel ? mzDraft.sure : mzDraft.n);
  mzDraft = { tipo: 'corano', n: 1, sure: [], fine: '' };
  renderMemorizzazione();
  const S = store.statMem();
  toast(S.piano ? `Piano avviato · ${S.piano.alGiorno} versetti al giorno` : 'Piano avviato');
}

function renderPensieri() {
  let html = head('Il tuo diario', 'Pensieri', 'Ogni pensiero ricorda da dove è nato. Da qui può maturare e migrare nello Studio.');
  html += `<div class="add-pensiero" onclick="openPensieroModal()">＋ Aggiungi un pensiero…</div>`;
  const list = [...store.list('pensieri')].reverse();
  html += list.map(p => {
    const anc = anchorLabels(p).map(a =>
      `<span class="anchor" ${a.onclick ? `onclick="${a.onclick}" style="cursor:pointer"` : ''}>${a.txt}</span>`).join('');
    return `<div class="pens"><div class="anchors">${anc}</div>
    <div class="tx">${esc(p.testo)}</div><div class="dt">${esc(p.data || '')}</div></div>`;
  }).join('') || '<div class="empty">Ancora nessun pensiero — scrivine uno qui sopra.</div>';
  $('#p-pensieri').innerHTML = html;
}

/* ---- modale Aggiungi pensiero (con collegamento) ---- */
/* tipi attivati nel modale: un pensiero può nascere da più cose insieme */
let ptTipi = [];
function openPensieroModal(preset) {
  $('#pt-testo').value = '';
  ptTipi = preset ? [preset.tipo] : [];
  renderPensieroLinks(preset);
  $('#veil-pensiero').classList.add('on');
}
function closePensieroModal() { $('#veil-pensiero').classList.remove('on'); ptTipi = []; }

function ptToggleTipo(t) {
  const i = ptTipi.indexOf(t);
  i >= 0 ? ptTipi.splice(i, 1) : ptTipi.push(t);
  renderPensieroLinks();
}

/* i chip dei tipi + un selettore "quale" per ogni tipo acceso */
function renderPensieroLinks(preset) {
  $('#pt-tipi').innerHTML = Object.entries(ANCORE).map(([k, c]) =>
    `<span class="chip ${ptTipi.includes(k) ? 'sel' : ''}" onclick="ptToggleTipo('${k}')">${c.ico} ${esc(c.l)}</span>`).join('');

  $('#pt-quali').innerHTML = ptTipi.map(k => {
    const c = ANCORE[k];
    const righe = store.list(c.t) || [];
    const pre = preset && preset.tipo === k ? String(preset.id) : '';
    return `<div class="f"><label>${c.ico} Quale ${esc(c.l.toLowerCase())}</label>
      <select id="pt-q-${k}">
        <option value="">—</option>
        ${righe.map(r => `<option value="${r.id}" ${String(r.id) === pre ? 'selected' : ''}>${esc(String(c.txt(r) || ''))}</option>`).join('')}
      </select></div>`;
  }).join('') || `<div class="set-info">Nessun collegamento: il pensiero resterà «nato dalla giornata».</div>`;
}

function savePensiero() {
  const txt = $('#pt-testo').value.trim();
  if (!txt) { toast('Scrivi il pensiero'); return; }
  /* una riga di legami per ogni tipo acceso e valorizzato */
  const ancore = ptTipi.map(k => {
    const el = document.getElementById('pt-q-' + k);
    return el && el.value ? { tipo: k, id: el.value } : null;
  }).filter(Boolean);
  store.addPensiero(txt, ancore);
  closePensieroModal(); counts(); renderPensieri();
  toast(ancore.length > 1 ? `Pensiero salvato · ${ancore.length} collegamenti ✓` : 'Pensiero salvato ✓');
}

/* ============================================================
   STUDIO — card e pagine
   ============================================================ */
const vCard = v => { const s = suraOf(v.sura_id); return `<div class="card" onclick="apriAya(${v.sura_id},${v.aya})"><span class="k">${s ? s.numero + ' · ' + s.translit : ''} : ${v.numero}</span><div class="arh">${esc(v.arabo)}</div><p>${esc(v.traduzione)}</p></div>`; };
const hCard = h => `<div class="card" onclick="openDetail('hadith','${h.id}')"><span class="k">${esc(h.numero_rif || h.raccolta)}</span><h3>${esc(h.testo.slice(0, 50))}${h.testo.length > 50 ? '…' : ''}</h3><p>${esc(h.nota || h.isnad)}</p><div class="ft"><span class="dot ${h.grado === 'sahih' ? '' : 'h'}">${GRADO[h.grado]}</span></div></div>`;
const pCard = p => `<div class="card" onclick="openDetail('personaggio','${p.id}')"><span class="k">${CAT[p.categoria]}</span><h3>${esc(p.nome)}</h3><div class="arh">${esc(p.nome_arabo || '')}</div><p>${esc(p.biografia || '')}</p></div>`;
const sCard = s => { const su = suraOf(s.sura_id); return `<div class="card" onclick="openDetail('storia','${s.id}')"><span class="k">${su ? 'Sura ' + su.numero : ''}</span><h3>${esc(s.titolo)}</h3><p>${esc(s.riassunto || '')}</p></div>`; };
const tCard = t => `<div class="card" onclick="openDetail('tema','${t.id}')"><span class="k">Tema</span><h3>${esc(t.nome)}</h3><div class="arh">${esc(t.nome_arabo || '')}</div><p>${esc(t.descrizione || '')}</p></div>`;
const fCard = f => `<div class="card" onclick="openDetail('fiqh','${f.id}')"><span class="k">${esc(f.categoria)}</span><h3>${esc(f.titolo)}</h3><p>${esc(f.contenuto || '')}</p></div>`;

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
      <div class="pm-ar">${esc(p.nome_arabo || 'محمد ﷺ')}</div>
      <h3>${esc(p.nome)}</h3>
      <p>${esc(p.biografia || '')}</p>
    </div></div>`;
}

function renderPeople() {
  const catOpts = '<option value="">Tutte le categorie</option>'
    + '<option value="muhammad">Il Profeta Muḥammad ﷺ</option>'
    + PERS_SEZIONI.map(s => `<option value="${s.k}">${s.t}</option>`).join('');

  let html = head('Personaggi · الأعلام', 'Cerca e sfoglia', 'Cerca per categoria o parole chiave. In cima il Profeta ﷺ, poi le categorie.');
  html += `<div class="quran-search"><div class="qs-grid qs-grid-2">
      <div class="qs-field"><label>Categoria</label>
        <select id="pe-cat" onchange="peopleSearch()">${catOpts}</select></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="pe-kw" placeholder="Nome, biografia, fonte…" oninput="peopleSearch()"></div>
      <button class="qs-clear" onclick="peopleClear()" title="Azzera">✕</button>
    </div></div>
  <div id="pe-list"></div>`;
  $('#p-people').innerHTML = html;
  peopleSearch();
}

function peopleSearch() {
  const cat = $('#pe-cat').value;
  const kw = ($('#pe-kw').value || '').trim().toLowerCase();
  let list = store.list('personaggi');
  if (kw) list = list.filter(p => (p.nome + ' ' + (p.nome_arabo || '') + ' ' + (p.biografia || '') + ' ' + (p.fonte || '')).toLowerCase().includes(kw));

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

  $('#pe-list').innerHTML = html || `<div class="empty">Nessun personaggio trovato.</div>`;
}
function peopleClear() { $('#pe-cat').value = ''; $('#pe-kw').value = ''; peopleSearch(); }

/* ============================================================
   HADITH — ricerca (fonte + parole chiave) e lista
   ============================================================ */
function renderHadith() {
  /* fonti = raccolte effettivamente presenti tra gli hadith inseriti */
  const fonti = [...new Set(store.list('hadith').map(h => h.raccolta).filter(Boolean))].sort();
  const fonteOpts = '<option value="">Tutte le fonti</option>' +
    fonti.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');

  let html = head('Hadith · الحديث', 'Cerca e sfoglia', 'Cerca per fonte (Bukhārī, Muslim, Tirmidhī…) o per parole chiave. Sotto, la lista.');
  html += `<div class="quran-search"><div class="qs-grid qs-grid-2">
      <div class="qs-field"><label>Fonte</label>
        <select id="hs-fonte" onchange="hadithSearch()">${fonteOpts}</select></div>
      <div class="qs-field qs-kw"><label>Parole chiave</label>
        <input id="hs-kw" placeholder="Nel testo, nella nota, nell'isnād…" oninput="hadithSearch()"></div>
      <button class="qs-clear" onclick="hadithClear()" title="Azzera">✕</button>
    </div></div>
  <div id="hd-list"></div>`;
  $('#p-hadith').innerHTML = html;
  hadithSearch();                                  /* prima resa: lista completa */
}
function hadithSearch() {
  const fonte = $('#hs-fonte').value;
  const kw = ($('#hs-kw').value || '').trim().toLowerCase();
  let list = store.list('hadith');
  if (fonte) list = list.filter(h => h.raccolta === fonte);
  if (kw)    list = list.filter(h => (h.testo + ' ' + (h.nota || '') + ' ' + (h.isnad || '') + ' ' + (h.numero_rif || '') + ' ' + (h.raccolta || '')).toLowerCase().includes(kw));

  const box = $('#hd-list');
  const count = (fonte || kw) ? `<div class="qs-count">${list.length} hadith</div>` : '';
  box.innerHTML = count + (list.length
    ? `<div class="grid">${list.map(hCard).join('')}</div>`
    : `<div class="empty">Nessun hadith trovato tra quelli inseriti.</div>`);
}
function hadithClear() { $('#hs-fonte').value = ''; $('#hs-kw').value = ''; hadithSearch(); }

/* ============================================================
   SCHEDE DI STUDIO GENERICHE — Azioni, Segni dell'Ora,
   Creazione, Luoghi. Stessa forma: { titolo, arabo, categoria,
   descrizione, fonte }. Un solo motore: ricerca + griglia + dettaglio.
   La chiave della pagina è anche il nome della tabella nello store.
   ============================================================ */
const STUDIO_PAGES = {
  azioni:    { eye: 'Azioni · الأعمال',              title: 'Le azioni',        sub: 'Opere e loro peso: ciò che avvicina e ciò che allontana.',
               cats: { buona: 'Buone azioni', culto: 'Atti di culto', peccato: 'Peccati' } },
  segni_ora: { eye: "Segni dell'Ora · علامات الساعة", title: "I segni dell'Ora", sub: 'I segni minori e maggiori che precedono l’Ultimo Giorno.',
               cats: { minore: 'Segni minori', maggiore: 'Segni maggiori' } },
  creazione: { eye: 'La creazione · الخلق',          title: 'La creazione',     sub: 'Il cosmo, gli esseri e gli ordini del creato.' },
  luoghi:    { eye: 'Luoghi · الأماكن',              title: 'I luoghi',         sub: 'Luoghi sacri e dell’aldilà, con il loro significato.',
               cats: { sacro: 'Luoghi sacri', aldila: "Aldilà" } },
};
const catLabel = (cfg, k) => (cfg.cats && cfg.cats[k]) || k;

function gCard(key, x) {
  const cfg = STUDIO_PAGES[key];
  const badge = x.categoria ? esc(catLabel(cfg, x.categoria)) : esc(cfg.title);
  return `<div class="card" onclick="openStudioDetail('${key}',${x.id})">
    <span class="k">${badge}</span>
    <h3>${esc(x.titolo)}</h3>
    ${x.arabo ? `<div class="arh">${esc(x.arabo)}</div>` : ''}
    <p>${esc(x.descrizione || '')}</p></div>`;
}

function renderStudio(key) {
  const cfg = STUDIO_PAGES[key];
  const hasCats = cfg.cats && Object.keys(cfg.cats).length;
  let html = head(cfg.eye, cfg.title, cfg.sub);
  html += `<div class="quran-search"><div class="qs-grid ${hasCats ? 'qs-grid-2' : 'qs-grid-1'}">`;
  if (hasCats) {
    const opts = '<option value="">Tutte le categorie</option>' +
      Object.entries(cfg.cats).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    html += `<div class="qs-field"><label>Categoria</label>
      <select id="st-cat-${key}" onchange="studioSearch('${key}')">${opts}</select></div>`;
  }
  html += `<div class="qs-field qs-kw"><label>Parole chiave</label>
      <input id="st-kw-${key}" placeholder="Titolo, testo, fonte…" oninput="studioSearch('${key}')"></div>
      <button class="qs-clear" onclick="studioClear('${key}')" title="Azzera">✕</button>
    </div></div>
  <div id="st-list-${key}"></div>`;
  $('#p-' + key).innerHTML = html;
  studioSearch(key);
}
function studioSearch(key) {
  const catEl = $('#st-cat-' + key);
  const cat = catEl ? catEl.value : '';
  const kw = ($('#st-kw-' + key).value || '').trim().toLowerCase();
  let list = store.list(key);
  if (cat) list = list.filter(x => x.categoria === cat);
  if (kw)  list = list.filter(x => ((x.titolo || '') + ' ' + (x.arabo || '') + ' ' + (x.descrizione || '') + ' ' + (x.fonte || '')).toLowerCase().includes(kw));
  const box = $('#st-list-' + key);
  const count = (cat || kw) ? `<div class="qs-count">${list.length} voci</div>` : '';
  box.innerHTML = count + (list.length
    ? `<div class="grid">${list.map(x => gCard(key, x)).join('')}</div>`
    : `<div class="empty">Nessuna voce trovata.</div>`);
}
function studioClear(key) {
  const catEl = $('#st-cat-' + key); if (catEl) catEl.value = '';
  $('#st-kw-' + key).value = '';
  studioSearch(key);
}
function openStudioDetail(key, id) {
  const cfg = STUDIO_PAGES[key];
  const x = store.get(key, id);
  const catL = x.categoria ? ' · ' + esc(catLabel(cfg, x.categoria)) : '';
  let h = `<div class="reader"><div class="back" onclick="nav('${key}')">← Torna</div>`;
  h += `<div class="eye">${esc(cfg.eye)}${catL}</div><h1 class="t">${esc(x.titolo)}</h1>`;
  if (x.arabo)      h += `<div class="ayah" style="font-size:24px;padding:16px 22px">${esc(x.arabo)}</div>`;
  if (x.descrizione) h += `<div class="body" style="margin-top:12px">${esc(x.descrizione)}</div>`;
  if (x.fonte)      h += `<div class="src">📚 ${esc(x.fonte)}</div>`;
  /* solo le AZIONI sono il magazzino della routine: hadith che le fondano + attività che ne derivano */
  if (key === 'azioni') h += bloccoAzione(x);
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
    const az = store.get('azioni', +azioneId);
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
    ? fld('at-mom', 'Momento', 'select', store.momenti.filter(m => m.k !== 'lettura').map(m => opt(m.k, m.t, d.momento)).join(''))
    : `<div class="row2">
        ${fld('at-mom', 'Momento', 'select', store.momenti.filter(m => m.k !== 'lettura').map(m => opt(m.k, m.t, d.momento)).join(''))}
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
  if (az) openStudioDetail('azioni', +az); else renderImpostazioni();
  toast(d.verso === 'evitare' ? 'Aggiunta tra le cose da evitare ✓' : 'Ora è nella tua giornata ✓');
}

function collegaHadith(azioneId) {
  const v = $('#az-hd').value;
  if (!v) { toast('Scegli un hadith'); return; }
  store.collega('azione', azioneId, 'hadith', v, 'fondata_su');
  openStudioDetail('azioni', +azioneId); toast('Hadith collegato ✓');
}
function scollegaHadith(legameId, azioneId) {
  store.scollega(legameId);
  openStudioDetail('azioni', +azioneId); toast('Scollegato');
}
/* ============================================================
   HADITH — l'altro capo del flusso.
   Da qui nascono le azioni, si citano i personaggi, si scrivono pensieri.
   ============================================================ */
const RUOLI = { riporta: '🗣 lo riporta', citato: '👤 compare nel racconto' };

function bloccoHadith(x) {
  let h = '';

  /* --- personaggi: chi lo riporta, chi c'è dentro --- */
  const pers = store.collegatiA('hadith', x.id, 'personaggio');
  h += `<h2>Personaggi</h2>`;
  h += pers.map(l => {
    const p = store.get('personaggi', l.id);
    if (!p) return '';
    return `<div class="att-row">
      <div class="ar-b"><div class="ar-n" onclick="openDetail('personaggio','${p.id}')" style="cursor:pointer">${esc(p.nome)}</div>
      <div class="ar-m">${RUOLI[l.legame.relazione] || l.legame.relazione} · ${esc(CAT[p.categoria] || '')}</div></div>
      <button class="tb no" title="Scollega" onclick="scollegaDaHadith('${l.legame.id}','${x.id}')">✕</button></div>`;
  }).join('') || `<div class="empty" style="padding:12px">Nessuno collegato. Chi lo riporta? Chi compare nel racconto?</div>`;

  const pLiberi = store.list('personaggi').filter(p => !pers.some(l => String(l.id) === String(p.id)));
  if (pLiberi.length) h += `<div class="link-add">
    <select id="hd-pers"><option value="">＋ collega un personaggio…</option>
      ${pLiberi.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select>
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
      <div class="ar-m">${esc(catLabel(STUDIO_PAGES.azioni, a.categoria))}${n ? ` · ${n} nella mia giornata` : ' · non ancora praticata'}</div></div>
      <button class="tb no" title="Scollega" onclick="scollegaDaHadith('${l.id}','${x.id}')">✕</button></div>`;
  }).join('') || `<div class="empty" style="padding:12px">Nessuna azione nasce ancora da questo hadith.</div>`;

  const azLibere = store.list('azioni').filter(a => !az.some(l => String(l.da_id) === String(a.id)));
  h += `<div class="link-add">
    <select id="hd-az"><option value="">collega un'azione esistente…</option>
      ${azLibere.map(a => `<option value="${a.id}">${esc(a.titolo)}</option>`).join('')}</select>
    <button class="btn2" onclick="collegaAzione('${x.id}')">Collega</button></div>`;
  h += `<div class="link-add nuova-az">
    <input id="hd-aznome" placeholder="…oppure creane una nuova da qui">
    <select id="hd-azcat">${Object.entries(STUDIO_PAGES.azioni.cats).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
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
  const a = store.add('azioni', {
    titolo: nome, arabo: '', categoria: $('#hd-azcat').value,
    descrizione: '', fonte: hd ? (hd.numero_rif || hd.raccolta || '') : '',
  });
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
  if (az) openStudioDetail('azioni', +az); else renderImpostazioni();
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
const TOGGLE_SEZIONI = [
  ['lettura', 'Lettura'], ['memorizzazione', 'Memorizzazione'], ['pensieri', 'Pensieri'],
  ['allah', 'Allah'], ['quran', 'Corano'], ['hadith', 'Hadith'], ['people', 'Personaggi'],
  ['stories', 'Storie'], ['themes', 'Temi'], ['fiqh', 'Fiqh'],
  ['azioni', 'Azioni'], ['segni_ora', "Segni dell'Ora"], ['creazione', 'Creazione'], ['luoghi', 'Luoghi'],
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

  /* ---- 3.5 · LA MIA ROUTINE ---- */
  const rt = store.list('attivita');
  html += `<div class="hd">🔁 La mia routine <span class="hd-c">${rt.length}</span></div><div class="card set-card">
    <div class="set-info">Le attività nascono dal magazzino <b onclick="nav('azioni')" style="cursor:pointer;color:var(--brass)">Azioni</b>: apri un'azione, collegale gli hadith che la fondano e portala nella giornata.</div>`;
  html += store.momenti.filter(m => m.k !== 'lettura').map(m => {
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
  if (STUDIO_PAGES[p]) { renderStudio(p); return; }
  if (p === 'impostazioni') renderImpostazioni();
  if (p === 'allah') renderAllah();
  if (p === 'oggi') renderOggi();
  if (p === 'lettura') renderLettura();
  if (p === 'memorizzazione') renderMemorizzazione();
  if (p === 'pensieri') renderPensieri();
  if (p === 'quran') renderQuran();
  if (p === 'hadith') renderHadith();
  if (p === 'people') renderPeople();
  if (p === 'stories') $('#p-stories').innerHTML = head('Storie · القصص', 'Racconti', 'I grandi racconti in scene con insegnamenti.') + `<div class="grid">${store.list('storie').map(sCard).join('')}</div>`;
  if (p === 'themes') $('#p-themes').innerHTML = head('Temi · المواضيع', 'Temi & concetti', 'I fili che raccolgono tutto ciò che vi appartiene.') + `<div class="grid">${store.list('temi').map(tCard).join('')}</div>`;
  if (p === 'fiqh') $('#p-fiqh').innerHTML = head('Fiqh · الفقه', 'Regole e scuole', 'Solo qui la giurisprudenza: la giornata resta pratica pura.') + `<div class="grid">${store.list('fiqh').map(fCard).join('')}</div>`;
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
    ${x.nota ? `<div class="note-b"><div class="l">nota</div><div class="body" style="margin:0">${esc(x.nota)}</div></div>` : ''}`;
    h += bloccoHadith(x);
  }
  if (tipo === 'personaggio') {
    const x = store.get('personaggi', id);
    h += `<div class="eye">${CAT[x.categoria]}</div><h1 class="t">${esc(x.nome)}</h1>
    ${x.nome_arabo ? `<div class="ayah" style="font-size:22px;padding:16px 22px">${esc(x.nome_arabo)}</div>` : ''}
    <div class="body">${esc(x.biografia || '')}</div>${x.fonte ? `<div class="src">📚 ${esc(x.fonte)}</div>` : ''}`;
  }
  if (tipo === 'storia') {
    const x = store.get('storie', id); const su = suraOf(x.sura_id);
    h += `<div class="eye">Storia ${su ? '· Sura ' + su.numero : ''}</div><h1 class="t">${esc(x.titolo)}</h1><div class="trans">${esc(x.riassunto || '')}</div>${x.insegnamenti ? `<h2>Insegnamenti</h2><div class="body">${esc(x.insegnamenti)}</div>` : ''}`;
  }
  if (tipo === 'tema') {
    const x = store.get('temi', id);
    h += `<div class="eye">Tema</div><h1 class="t">${esc(x.nome)}</h1>${x.nome_arabo ? `<div class="ayah" style="font-size:22px;padding:16px 22px">${esc(x.nome_arabo)}</div>` : ''}<div class="trans">${esc(x.descrizione || '')}</div>`;
  }
  if (tipo === 'fiqh') {
    const x = store.get('fiqh', id);
    h += `<div class="eye">Fiqh · ${esc(x.categoria)}</div><h1 class="t">${esc(x.titolo)}</h1><div class="body" style="margin-top:12px">${esc(x.contenuto || '')}</div>${x.fonti ? `<div class="src">📚 ${esc(x.fonti)}</div>` : ''}`;
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
  store.list('personaggi').forEach(x => { if ((x.nome + ' ' + (x.biografia || '')).toLowerCase().includes(q)) hits.push(pCard(x)); });
  store.list('storie').forEach(x => { if ((x.titolo + ' ' + (x.riassunto || '')).toLowerCase().includes(q)) hits.push(sCard(x)); });
  store.list('temi').forEach(x => { if ((x.nome + ' ' + (x.descrizione || '')).toLowerCase().includes(q)) hits.push(tCard(x)); });
  store.list('fiqh').forEach(x => { if ((x.titolo + ' ' + (x.contenuto || '')).toLowerCase().includes(q)) hits.push(fCard(x)); });
  store.list('adhkar').forEach(a => { if ((a.nome + ' ' + (a.traduzione || '')).toLowerCase().includes(q)) hits.push(`<div class="card"><span class="k">dhikr · ${a.momento.replace('_', ' ')}</span><h3>${esc(a.nome)}</h3><p>${esc(a.traduzione || '')}</p></div>`); });
  store.list('pensieri').forEach(p => { if (p.testo.toLowerCase().includes(q)) hits.push(`<div class="card" onclick="nav('pensieri')"><span class="k">pensiero</span><p>${esc(p.testo)}</p></div>`); });
  $('#p-search').innerHTML = head('Ricerca', `«${esc(q)}»`, hits.length + ' risultati.') + `<div class="grid">${hits.join('') || '<div class="empty">Nessun risultato.</div>'}</div>`;
  show('search');
}
const _q = $('#q'); if (_q) _q.oninput = onSearch;

/* ============================================================
   MODALE — nuova voce
   ============================================================ */
function openModal() { $('#veil').classList.add('on'); renderForm(); }
function closeModal() { $('#veil').classList.remove('on'); }
const _bn = $('#btn-new'); if (_bn) _bn.onclick = openModal;
$('#btn-cancel').onclick = closeModal;
$('#btn-save').onclick = saveEntry;
$('#m-type').onchange = renderForm;
$('#veil').onclick = e => { if (e.target === $('#veil')) closeModal(); };

/* modale aggiungi pensiero */
$('#pt-cancel').onclick = closePensieroModal;
$('#pt-save').onclick = savePensiero;
$('#veil-pensiero').onclick = e => { if (e.target === $('#veil-pensiero')) closePensieroModal(); };

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

function renderForm() {
  const t = $('#m-type').value; const F = $('#m-fields');
  const suraOpts = store.list('sure').map(s => `<option value="${s.id}">${s.numero} · ${s.translit}</option>`).join('');
  const vOpts = '<option value="">—</option>' + store.list('versetti').map(v => { const s = suraOf(v.sura_id); return `<option value="${v.id}">${s ? s.numero : ''}:${v.numero}</option>`; }).join('');
  const hOpts = '<option value="">—</option>' + store.list('hadith').map(x => `<option value="${x.id}">${esc(x.numero_rif)}</option>`).join('');
  if (t === 'pensiero') F.innerHTML = fld('f-testo', 'Il pensiero', 'textarea') + `<div class="row2">${fld('f-anct', 'Nato da…', 'select', '<option value="">la giornata</option><option value="versetto">un versetto</option><option value="hadith">un hadith</option>')}${fld('f-anci', 'Quale', 'select', vOpts)}</div>`;
  if (t === 'adhkar') F.innerHTML = fld('f-nome', 'Nome') + `<div class="row2">${fld('f-mom', 'Momento', 'select', store.momenti.filter(m => m.k !== 'lettura').map(m => `<option value="${m.k}">${m.t}</option>`).join(''))}${fld('f-ora', 'Orario fisso (facolt.)', 'input', 'type="time"')}</div>` + fld('f-rip', 'Ripetizioni (facolt.)', 'input', 'placeholder="33×3, 1–14…"') + fld('f-ar', 'Arabo (facolt.)', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione (facolt.)', 'textarea') + `<div class="row2">${fld('f-v', 'Versetto che ne parla', 'select', vOpts)}${fld('f-h', 'Hadith che lo conferma', 'select', hOpts)}</div>`;
  if (t === 'versetto') F.innerHTML = fld('f-sura', 'Sura', 'select', suraOpts) + fld('f-num', 'Numero aya', 'input', 'type="number"') + fld('f-ar', 'Arabo', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione', 'textarea') + fld('f-ctx', 'Contesto (facolt.)', 'textarea');
  if (t === 'hadith') F.innerHTML = fld('f-titolo', 'Titolo (come lo richiami)') + fld('f-ar', 'Testo arabo (facolt.)', 'textarea', 'class="ar-in"') + fld('f-testo', 'Testo italiano', 'textarea') + `<div class="row2">${fld('f-racc', 'Raccolta')}${fld('f-rif', 'Riferimento')}</div>` + fld('f-grado', 'Grado', 'select', '<option value="sahih">🟢 Sahih</option><option value="hasan">Hasan</option><option value="daif">Daif</option><option value="qudsi">Qudsi</option><option value="non_verificato">Da verificare</option>') + fld('f-nota', 'Nota (facolt.)', 'textarea');
  if (t === 'personaggio') F.innerHTML = `<div class="row2">${fld('f-nome', 'Nome')}${fld('f-arn', 'Nome arabo', 'input', 'class="ar-in"')}</div>` + fld('f-cat', 'Categoria', 'select', Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')) + fld('f-bio', 'Biografia', 'textarea');
  if (t === 'storia') F.innerHTML = fld('f-titolo', 'Titolo') + fld('f-sura', 'Sura', 'select', '<option value="">—</option>' + suraOpts) + fld('f-rias', 'Riassunto', 'textarea');
  if (t === 'tema') F.innerHTML = `<div class="row2">${fld('f-nome', 'Nome')}${fld('f-arn', 'Arabo', 'input', 'class="ar-in"')}</div>` + fld('f-desc', 'Descrizione', 'textarea');
  if (t === 'fiqh') F.innerHTML = fld('f-titolo', 'Titolo') + fld('f-cat', 'Categoria', 'select', '<option value="salat">Ṣalāt</option><option value="tahara">Ṭahāra</option><option value="madhab">Madhab</option><option value="digiuno">Digiuno</option><option value="altro">Altro</option>') + fld('f-cont', 'Contenuto', 'textarea') + fld('f-fonti', 'Fonti (facolt.)');
}

function saveEntry() {
  const t = $('#m-type').value;
  if (t === 'pensiero') { if (!val('f-testo')) { toast('Scrivi il pensiero'); return; } store.addPensiero(val('f-testo'), val('f-anct') && val('f-anci') ? [{ tipo: val('f-anct'), id: val('f-anci') }] : []); }
  if (t === 'adhkar') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('adhkar', { nome: val('f-nome'), momento: val('f-mom'), ora: val('f-ora'), rip: val('f-rip'), arabo: val('f-ar'), traduzione: val('f-tr'), versetto_id: val('f-v') ? +val('f-v') : null, hadith_id: val('f-h') ? +val('f-h') : null }); }
  if (t === 'versetto') { if (!val('f-tr')) { toast('Serve la traduzione'); return; } store.add('versetti', { sura_id: +val('f-sura'), numero: +val('f-num') || 0, arabo: val('f-ar'), traduzione: val('f-tr'), contesto: val('f-ctx'), nota: '' }); }
  if (t === 'hadith') { if (!val('f-testo')) { toast('Serve il testo'); return; } store.add('hadith', { titolo: val('f-titolo'), testo: val('f-testo'), testo_ar: val('f-ar'), raccolta: val('f-racc'), numero_rif: val('f-rif'), grado: val('f-grado'), narratore_id: null, isnad: '', nota: val('f-nota') }); }
  if (t === 'personaggio') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('personaggi', { nome: val('f-nome'), nome_arabo: val('f-arn'), categoria: val('f-cat'), biografia: val('f-bio'), fonte: '' }); }
  if (t === 'storia') { if (!val('f-titolo')) { toast('Serve il titolo'); return; } store.add('storie', { titolo: val('f-titolo'), sura_id: val('f-sura') ? +val('f-sura') : null, riassunto: val('f-rias'), insegnamenti: '' }); }
  if (t === 'tema') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('temi', { nome: val('f-nome'), nome_arabo: val('f-arn'), descrizione: val('f-desc') }); }
  if (t === 'fiqh') { if (!val('f-titolo')) { toast('Serve il titolo'); return; } store.add('fiqh', { titolo: val('f-titolo'), categoria: val('f-cat'), contenuto: val('f-cont'), fonti: val('f-fonti') }); }
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
