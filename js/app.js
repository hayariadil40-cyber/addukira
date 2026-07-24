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
    if (v) out += `<span class="pill q" onclick="event.stopPropagation();openDetail('versetto',${v.id})">${s ? s.numero : ''}:${v.numero} — ${esc(v.traduzione.slice(0, 42))}…</span>`;
  }
  if (a.hadith_id) {
    const h = store.get('hadith', a.hadith_id);
    if (h) out += `<span class="pill h" onclick="event.stopPropagation();openDetail('hadith',${h.id})">${esc(h.numero_rif)}</span>`;
  }
  return out ? `<div class="why">${out}</div>` : '';
}

function hijriToday(d, offset) {
  const dd = new Date(d.getTime() + (offset || 0) * 86400000);
  try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(dd); }
  catch (e) {
    try { return new Intl.DateTimeFormat('ar-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(dd); }
    catch (_) { return 'التقويم الهجري'; }
  }
}

/* intestazione condivisa: data ita (sinistra) + data hijri (destra, se attiva) */
function dayHeader(title) {
  const S = store.getSettings(), d = new Date();
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const hj = S.tempo.hijri_mostra ? `<div class="hijri">${hijriToday(d, S.tempo.hijri_offset)}</div>` : '';
  return `<div class="day-head"><div><div class="eye">${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}</div><h1 class="t">${title}</h1></div>${hj}</div>`;
}

function renderOggi() {
  /* data + hijri */
  $('#oggi-head').innerHTML = dayHeader('La tua giornata');

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
    const items = store.list('adhkar').filter(a => a.momento === m.k);
    if (!items.length) return;
    const done = items.filter(a => store.isDone(a.id)).length;
    html += `<div class="momento"><div class="mo-t"><span class="ico">${m.ico}</span>${m.t} <span class="st">${done} di ${items.length}</span></div>`;
    items.forEach(a => {
      html += `<div class="task ${store.isDone(a.id) ? 'done' : ''}">
        <div class="chk" onclick="store.toggle(${a.id});renderOggi()">${store.isDone(a.id) ? '✓' : ''}</div>
        <div class="b"><div class="nm">${esc(a.nome)} ${a.rip ? `<span class="rep">${esc(a.rip)}</span>` : ''}</div>
        ${a.arabo ? `<div class="arx">${esc(a.arabo)}</div>` : ''}
        ${a.traduzione ? `<div class="tr">${esc(a.traduzione)}</div>` : ''}
        ${pillLinks(a)}</div></div>`;
    });
    html += '</div>';
  });
  $('#oggi-giornata').innerHTML = html;
}

/* ============================================================
   LETTURA
   ============================================================ */
function renderLettura() {
  const L = store.lettura();
  const active = store.activeKhatam();
  const done = store.khatamDone();
  let html = dayHeader('La lettura');

  /* pannello khatam: contatore + % + crea/ferma/elimina */
  html += `<div class="khatam-panel"><div class="kh-row">
    <div class="kh-count"><div class="n">${done}</div><div class="l">khatam<br>completati</div></div>`;
  if (active) {
    const s = suraOf(active.sura_id);
    html += `<div class="kh-active">
      <div class="kh-lab">Khatam #${active.numero} in corso</div>
      <div class="kh-pos">${s ? s.translit : ''} ${s ? s.numero : ''}:${active.aya || 'inizio'} · <b>${L.pct}%</b> del Corano</div>
      <div class="prog"><i style="width:${L.pct}%"></i></div>
      <div class="kh-btns">
        <button class="kh-b done" ${L.pct >= 100 ? '' : 'disabled'} title="${L.pct >= 100 ? 'Completa il khatam' : 'Porta il segnalibro all’ultimo versetto (114:6) per completare'}" onclick="openKhatamComplete()">✓ Completato</button>
        <button class="kh-b stop" onclick="store.stopKhatam();renderLettura();toast('Khatam fermato')">⏸ Ferma</button>
        <button class="kh-b del" onclick="if(confirm('Eliminare il khatam #${active.numero} in corso?')){store.deleteKhatam(${active.id});renderLettura();toast('Khatam eliminato')}">🗑 Elimina</button>
      </div></div>`;
  } else {
    html += `<div class="kh-active">
      <div class="kh-lab">Nessun khatam in corso</div>
      <div class="kh-pos">Inizia una nuova lettura completa del Corano.</div>
      <div class="kh-btns"><button class="kh-b start" onclick="store.newKhatam();renderLettura();toast('Nuovo khatam avviato')">▶ Inizia un nuovo khatam</button></div>
    </div>`;
  }
  html += `</div></div>`;

  if (!active) {
    html += `<div class="empty">Avvia un khatam per iniziare a leggere e muovere il segnalibro.</div>`;
    $('#p-lettura').innerHTML = html;
    return;
  }

  let lastSura = null;
  store.list('ayat_demo').forEach(v => {
    const s = suraOf(v.sura_id);
    if (v.sura_id !== lastSura) { html += `<div class="sura-sep">Sura ${s.numero} · ${s.translit} · ${s.nome_arabo}</div>`; lastSura = v.sura_id; }
    const isBm = active.sura_id === v.sura_id && active.aya === v.aya;
    const isHl = store.isHl(v.sura_id, v.aya);
    if (isBm) html += `<div class="marker">⛿ il tuo segnalibro · ${s.numero}:${v.aya}</div>`;
    html += `<div class="aya-row ${isHl ? 'hl' : ''}"><div class="num">${v.aya}</div>
    <div class="tx"><div class="arq">${esc(v.arabo)}</div><div class="itq">${esc(v.it)}</div>
    <div class="think">💭<input id="th-${v.aya}" placeholder="Un pensiero su ${s.numero}:${v.aya}…"><button class="go" onclick="addThought(${v.sura_id},${v.aya})">Salva</button></div></div>
    <div class="act">
      <button class="ab ${isBm ? 'on' : ''}" title="Segnalibro" onclick="store.setBookmark(${v.sura_id},${v.aya});renderLettura();toast('Segnalibro su ${s.numero}:${v.aya}')">⛿</button>
      <button class="ab ${isHl ? 'on' : ''}" title="Evidenzia" onclick="store.toggleHl(${v.sura_id},${v.aya});renderLettura()">🖊</button>
    </div></div>`;
  });
  html += `<div class="sujud"><div class="l">۩ Versetti di prosternazione</div>Quando arrivi a un'aya col simbolo ۩, l'app mostrerà la tua dua del sujūd. Al completamento del khatam: la dua di completamento e +1 al contatore.</div>`;
  $('#p-lettura').innerHTML = html;
}

function addThought(sid, aya) {
  const inp = document.getElementById('th-' + aya); const txt = inp.value.trim();
  if (!txt) { toast('Scrivi prima il pensiero'); return; }
  let v = store.list('versetti').find(x => x.sura_id === sid && x.numero === aya);
  if (!v) {
    const demo = store.list('ayat_demo').find(x => x.aya === aya) || {};
    v = store.add('versetti', { sura_id: sid, numero: aya, arabo: demo.arabo || '', traduzione: demo.it || '', contesto: '', nota: '' });
  }
  store.add('pensieri', { testo: txt, anchor_tipo: 'versetto', anchor_id: v.id, data: store.today() });
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
  if (txt) { store.add('pensieri', { testo: txt, anchor_tipo: null, anchor_id: null, data: store.today() }); counts(); toast('Pensiero salvato'); }
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
/* stima pagine del muṣḥaf (604) per ḥizb e per ottava — approssimata, in bozza */
function hizbPages(h) { return [Math.round((h - 1) * 604 / 60) + 1, Math.round(h * 604 / 60)]; }
function ottavaPages(h, o) {
  const [s, e] = hizbPages(h); const span = (e - s + 1) / 8;
  const ps = Math.floor(s + (o - 1) * span);
  return [ps, Math.max(ps, Math.round(s + o * span) - 1)];
}

function renderMemorizzazione() {
  const st = store.studio();
  const memPct = store.memPct();
  const [ps, pe] = ottavaPages(st.hizb, st.ottava);

  let html = dayHeader('Memorizzazione');

  /* piano di studio (al posto del khatam) */
  html += `<div class="khatam-panel"><div class="kh-row">
    <div class="kh-count"><div class="n">${memPct}%</div><div class="l">memorizzato<br>del Corano</div></div>
    <div class="kh-active">
      <div class="kh-lab">Piano di studio</div>
      <select class="mz-piano-sel" onchange="store.setStudio({piano:this.value});renderMemorizzazione()">
        ${Object.keys(PIANI).map(p => `<option value="${p}" ${st.piano === p ? 'selected' : ''}>${PIANI[p].label}</option>`).join('')}
      </select>
      <div class="kh-pos">${PIANI[st.piano].desc}</div>
      <div class="prog"><i style="width:${memPct}%"></i></div>
    </div></div></div>`;

  /* filtro: cosa studiare (ḥizb + ottava) */
  html += `<div class="mz-filter"><div class="mz-filter-t">Cosa vuoi studiare oggi</div>
    <div class="mz-controls">
      <label>Ḥizb <select onchange="store.setStudio({hizb:+this.value});renderMemorizzazione()">${mzSeq(60).map(i => `<option value="${i}" ${st.hizb === i ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      <label>Ottava <select onchange="store.setStudio({ottava:+this.value});renderMemorizzazione()">${mzSeq(8).map(i => `<option value="${i}" ${st.ottava === i ? 'selected' : ''}>${i}/8</option>`).join('')}</select></label>
      <span class="mz-range">≈ pagine ${ps}–${pe} del muṣḥaf</span>
    </div></div>`;

  /* Corano del range (bozza: versetti demo) */
  html += `<div class="mz-page-head">Ḥizb ${st.hizb} · Ottava ${st.ottava}/8 <span class="mz-note">bozza — il testo reale del range arriverà con l'import del Corano</span></div>`;
  html += store.list('ayat_demo').map(v => {
    const s = suraOf(v.sura_id); const isM = store.isMem(v.sura_id, v.aya);
    return `<div class="mz-aya ${isM ? 'mem' : ''}">
      <button class="mz-chk" title="Segna come memorizzato" onclick="store.toggleMem(${v.sura_id},${v.aya});renderMemorizzazione()">${isM ? '✓' : ''}</button>
      <div class="mz-num">${s ? s.numero : ''}:${v.aya}</div>
      <div class="mz-ar">${esc(v.arabo)}</div></div>`;
  }).join('');

  $('#p-memorizzazione').innerHTML = html;
}

/* ============================================================
   PENSIERI
   ============================================================ */
function anchorLabel(p) {
  const t = p.anchor_tipo, id = p.anchor_id;
  if (t === 'versetto') {
    const v = store.get('versetti', id); const s = v ? suraOf(v.sura_id) : null;
    return { txt: `📖 nato da ${s ? s.translit : ''} ${s ? s.numero : ''}:${v ? v.numero : ''}`, onclick: `openDetail('versetto',${id})` };
  }
  if (t === 'hadith') { const h = store.get('hadith', id); return { txt: `🟢 nato da ${h ? h.numero_rif : ''}`, onclick: `openDetail('hadith',${id})` }; }
  if (t === 'personaggio') { const x = store.get('personaggi', id); return { txt: `👤 ${x ? esc(x.nome) : ''}`, onclick: `openDetail('personaggio',${id})` }; }
  if (t === 'tema') { const x = store.get('temi', id); return { txt: `🧵 ${x ? esc(x.nome) : ''}`, onclick: `openDetail('tema',${id})` }; }
  if (t === 'storia') { const x = store.get('storie', id); return { txt: `🏜️ ${x ? esc(x.titolo) : ''}`, onclick: `openDetail('storia',${id})` }; }
  if (t === 'sura') { const s = store.get('sure', id); return { txt: `🕋 Sura ${s ? s.numero : ''} · ${s ? s.translit : ''}`, onclick: `nav('quran')` }; }
  if (t === 'azione') { const a = store.get('adhkar', id); return { txt: `☑️ ${a ? esc(a.nome) : ''}`, onclick: `nav('oggi')` }; }
  return { txt: '☀️ nato dalla giornata', onclick: '' };
}

function renderPensieri() {
  let html = head('Il tuo diario', 'Pensieri', 'Ogni pensiero ricorda da dove è nato. Da qui può maturare e migrare nello Studio.');
  html += `<div class="add-pensiero" onclick="openPensieroModal()">＋ Aggiungi un pensiero…</div>`;
  const list = [...store.list('pensieri')].reverse();
  html += list.map(p => {
    const a = anchorLabel(p);
    const go = a.onclick ? `onclick="${a.onclick}" style="cursor:pointer"` : '';
    return `<div class="pens"><div class="anchor" ${go}>${a.txt}</div>
    <div class="tx">${esc(p.testo)}</div><div class="dt">${esc(p.data || '')}</div></div>`;
  }).join('') || '<div class="empty">Ancora nessun pensiero — scrivine uno qui sopra.</div>';
  $('#p-pensieri').innerHTML = html;
}

/* ---- modale Aggiungi pensiero (con collegamento) ---- */
function openPensieroModal() {
  $('#pt-testo').value = ''; $('#pt-tipo').value = '';
  renderPensieroTarget();
  $('#veil-pensiero').classList.add('on');
}
function closePensieroModal() { $('#veil-pensiero').classList.remove('on'); }
function renderPensieroTarget() {
  const t = $('#pt-tipo').value; const sel = $('#pt-target');
  const wrap = a => '<option value="">—</option>' + a;
  if (!t) { sel.innerHTML = '<option value="">(nessun collegamento)</option>'; sel.disabled = true; return; }
  sel.disabled = false;
  if (t === 'versetto') sel.innerHTML = wrap(store.list('versetti').map(v => { const s = suraOf(v.sura_id); return `<option value="${v.id}">${s ? s.numero : ''}:${v.numero} — ${esc(v.traduzione.slice(0, 40))}</option>`; }).join(''));
  else if (t === 'sura') sel.innerHTML = wrap(store.list('sure').map(s => `<option value="${s.id}">${s.numero} · ${esc(s.translit)}</option>`).join(''));
  else if (t === 'personaggio') sel.innerHTML = wrap(store.list('personaggi').map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join(''));
  else if (t === 'tema') sel.innerHTML = wrap(store.list('temi').map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join(''));
  else if (t === 'hadith') sel.innerHTML = wrap(store.list('hadith').map(x => `<option value="${x.id}">${esc(x.numero_rif || x.raccolta)}</option>`).join(''));
  else if (t === 'storia') sel.innerHTML = wrap(store.list('storie').map(x => `<option value="${x.id}">${esc(x.titolo)}</option>`).join(''));
  else if (t === 'azione') sel.innerHTML = wrap(store.list('adhkar').map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join(''));
}
function savePensiero() {
  const txt = $('#pt-testo').value.trim();
  if (!txt) { toast('Scrivi il pensiero'); return; }
  const t = $('#pt-tipo').value || null;
  const id = $('#pt-target').value ? +$('#pt-target').value : null;
  const linked = t && id;
  store.add('pensieri', { testo: txt, anchor_tipo: linked ? t : null, anchor_id: linked ? id : null, data: store.today() });
  closePensieroModal(); counts(); renderPensieri();
  toast('Pensiero salvato ✓');
}

/* ============================================================
   STUDIO — card e pagine
   ============================================================ */
const vCard = v => { const s = suraOf(v.sura_id); return `<div class="card" onclick="openDetail('versetto',${v.id})"><span class="k">${s ? s.numero + ' · ' + s.translit : ''} : ${v.numero}</span><div class="arh">${esc(v.arabo)}</div><p>${esc(v.traduzione)}</p></div>`; };
const hCard = h => `<div class="card" onclick="openDetail('hadith',${h.id})"><span class="k">${esc(h.numero_rif || h.raccolta)}</span><h3>${esc(h.testo.slice(0, 50))}${h.testo.length > 50 ? '…' : ''}</h3><p>${esc(h.nota || h.isnad)}</p><div class="ft"><span class="dot ${h.grado === 'sahih' ? '' : 'h'}">${GRADO[h.grado]}</span></div></div>`;
const pCard = p => `<div class="card" onclick="openDetail('personaggio',${p.id})"><span class="k">${CAT[p.categoria]}</span><h3>${esc(p.nome)}</h3><div class="arh">${esc(p.nome_arabo || '')}</div><p>${esc(p.biografia || '')}</p></div>`;
const sCard = s => { const su = suraOf(s.sura_id); return `<div class="card" onclick="openDetail('storia',${s.id})"><span class="k">${su ? 'Sura ' + su.numero : ''}</span><h3>${esc(s.titolo)}</h3><p>${esc(s.riassunto || '')}</p></div>`; };
const tCard = t => `<div class="card" onclick="openDetail('tema',${t.id})"><span class="k">Tema</span><h3>${esc(t.nome)}</h3><div class="arh">${esc(t.nome_arabo || '')}</div><p>${esc(t.descrizione || '')}</p></div>`;
const fCard = f => `<div class="card" onclick="openDetail('fiqh',${f.id})"><span class="k">${esc(f.categoria)}</span><h3>${esc(f.titolo)}</h3><p>${esc(f.contenuto || '')}</p></div>`;

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
function quranSearch() {
  const suraId = $('#qs-sura').value ? +$('#qs-sura').value : null;
  const aya = $('#qs-aya').value ? +$('#qs-aya').value : null;
  const kw = ($('#qs-kw').value || '').trim().toLowerCase();
  const box = $('#qs-results');

  if (!suraId && !aya && !kw) { box.innerHTML = ''; return; }   /* nessun criterio → nessun risultato */

  let list = store.list('versetti');
  if (suraId) list = list.filter(v => v.sura_id === suraId);
  if (aya)    list = list.filter(v => v.numero === aya);
  if (kw)     list = list.filter(v => (v.arabo + ' ' + v.traduzione + ' ' + (v.contesto || '')).toLowerCase().includes(kw));

  if (!list.length) {
    box.innerHTML = `<div class="empty">Nessun versetto trovato tra quelli caricati.<br>
      <span class="mz-note">Il testo completo del Corano (6.236 versetti) arriverà con l'import: allora la ricerca coprirà tutto.</span></div>`;
    return;
  }
  box.innerHTML = `<div class="qs-count">${list.length} versett${list.length === 1 ? 'o' : 'i'}</div>
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
  return `<div class="pers-muhammad" onclick="openDetail('personaggio',${p.id})">
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
  h += '</div>'; $('#p-detail').innerHTML = h; show('detail');
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
  return `<div class="asma-card" onclick="openAsmaDetail(${x.id})">
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
  const note = `<div class="mz-page-head" style="margin-top:20px">I Nomi più belli
    <span class="mz-note">bozza — 14 dei 99; i restanti in arrivo</span></div>`;
  box.innerHTML = (kw ? count : note) + (list.length
    ? `<div class="asma-grid">${list.map(asmaCard).join('')}</div>`
    : `<div class="empty">Nessun Nome trovato.</div>`);
}
function asmaClear() { $('#as-kw').value = ''; asmaSearch(); }
function openAsmaDetail(id) {
  const x = store.get('asma', id);
  const pens = store.list('pensieri').filter(p => p.anchor_tipo === 'asma' && p.anchor_id === id);
  let h = `<div class="reader"><div class="back" onclick="nav('allah')">← Torna</div>`;
  h += `<div class="eye">Asmāʾ al-Ḥusnā · Nome ${x.numero}</div>
    <div class="ayah" style="font-size:40px;text-align:center;padding:26px">${esc(x.arabo)}</div>
    <h1 class="t" style="text-align:center">${esc(x.translit)}</h1>
    <div class="trans">${esc(x.significato)}</div>
    <h2>Pensieri nati qui</h2>${pens.map(p => `<div class="note-b"><div class="l">pensiero</div><div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('') || '<div class="empty" style="padding:14px">Nessuno ancora.</div>'}`;
  h += '</div>'; $('#p-detail').innerHTML = h; show('detail');
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
      <span class="pname" onclick="setLuogoAttivo(${l.id})">${l.id === S.preghiere.luogo_attivo ? '● ' : '○ '}${esc(l.nome)} <span class="set-lbl" style="margin:0;display:inline">${esc(tzLabel(l.tz))}</span></span>
      <button class="rm" onclick="delLuogo(${l.id})" title="Elimina">✕</button></div>`).join('')}
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
function openDetail(tipo, id) {
  let h = '<div class="reader"><div class="back" onclick="nav(\'oggi\')">← Torna</div>';
  if (tipo === 'versetto') {
    const v = store.get('versetti', id); const s = suraOf(v.sura_id);
    const pens = store.list('pensieri').filter(p => p.anchor_tipo === 'versetto' && p.anchor_id === id);
    h += `<div class="eye">Corano · ${s ? s.numero + ' ' + s.translit : ''}</div><h1 class="t">${s ? esc(s.titolo_it || s.translit) : ''} · ${v.numero}</h1>
    ${v.arabo ? `<div class="ayah">${esc(v.arabo)}<span class="numx">${s ? s.numero : ''}:${v.numero}</span></div>` : ''}
    <div class="trans">«${esc(v.traduzione)}»</div>
    ${v.contesto ? `<h2>Contesto</h2><div class="body">${esc(v.contesto)}</div>` : ''}
    <h2>Pensieri nati qui</h2>${pens.map(p => `<div class="note-b"><div class="l">pensiero</div><div class="body" style="margin:0">${esc(p.testo)}</div></div>`).join('') || '<div class="empty" style="padding:14px">Nessuno ancora.</div>'}`;
  }
  if (tipo === 'hadith') {
    const x = store.get('hadith', id);
    h += `<div class="eye">Hadith · ${esc(x.numero_rif || '')}</div><h1 class="t">${esc(x.testo.slice(0, 58))}…</h1>
    <div class="trans">«${esc(x.testo)}»</div>
    <div class="src"><b>${GRADO[x.grado]}</b>${x.raccolta ? ' — ' + esc(x.raccolta) : ''}${x.isnad ? '<br>Isnād: ' + esc(x.isnad) : ''}</div>
    ${x.nota ? `<div class="note-b"><div class="l">nota</div><div class="body" style="margin:0">${esc(x.nota)}</div></div>` : ''}`;
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
$('#pt-tipo').onchange = renderPensieroTarget;
$('#pt-cancel').onclick = closePensieroModal;
$('#pt-save').onclick = savePensiero;
$('#veil-pensiero').onclick = e => { if (e.target === $('#veil-pensiero')) closePensieroModal(); };

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
  if (t === 'adhkar') F.innerHTML = fld('f-nome', 'Nome') + fld('f-mom', 'Momento', 'select', store.momenti.filter(m => m.k !== 'lettura').map(m => `<option value="${m.k}">${m.t}</option>`).join('')) + fld('f-rip', 'Ripetizioni (facolt.)', 'input', 'placeholder="33×3, 1–14…"') + fld('f-ar', 'Arabo (facolt.)', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione (facolt.)', 'textarea') + `<div class="row2">${fld('f-v', 'Versetto che ne parla', 'select', vOpts)}${fld('f-h', 'Hadith che lo conferma', 'select', hOpts)}</div>`;
  if (t === 'versetto') F.innerHTML = fld('f-sura', 'Sura', 'select', suraOpts) + fld('f-num', 'Numero aya', 'input', 'type="number"') + fld('f-ar', 'Arabo', 'textarea', 'class="ar-in"') + fld('f-tr', 'Traduzione', 'textarea') + fld('f-ctx', 'Contesto (facolt.)', 'textarea');
  if (t === 'hadith') F.innerHTML = fld('f-testo', 'Testo', 'textarea') + `<div class="row2">${fld('f-racc', 'Raccolta')}${fld('f-rif', 'Riferimento')}</div>` + fld('f-grado', 'Grado', 'select', '<option value="sahih">🟢 Sahih</option><option value="hasan">Hasan</option><option value="daif">Daif</option><option value="qudsi">Qudsi</option><option value="non_verificato">Da verificare</option>') + fld('f-nota', 'Nota (facolt.)', 'textarea');
  if (t === 'personaggio') F.innerHTML = `<div class="row2">${fld('f-nome', 'Nome')}${fld('f-arn', 'Nome arabo', 'input', 'class="ar-in"')}</div>` + fld('f-cat', 'Categoria', 'select', Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')) + fld('f-bio', 'Biografia', 'textarea');
  if (t === 'storia') F.innerHTML = fld('f-titolo', 'Titolo') + fld('f-sura', 'Sura', 'select', '<option value="">—</option>' + suraOpts) + fld('f-rias', 'Riassunto', 'textarea');
  if (t === 'tema') F.innerHTML = `<div class="row2">${fld('f-nome', 'Nome')}${fld('f-arn', 'Arabo', 'input', 'class="ar-in"')}</div>` + fld('f-desc', 'Descrizione', 'textarea');
  if (t === 'fiqh') F.innerHTML = fld('f-titolo', 'Titolo') + fld('f-cat', 'Categoria', 'select', '<option value="salat">Ṣalāt</option><option value="tahara">Ṭahāra</option><option value="madhab">Madhab</option><option value="digiuno">Digiuno</option><option value="altro">Altro</option>') + fld('f-cont', 'Contenuto', 'textarea') + fld('f-fonti', 'Fonti (facolt.)');
}

function saveEntry() {
  const t = $('#m-type').value;
  if (t === 'pensiero') { if (!val('f-testo')) { toast('Scrivi il pensiero'); return; } store.add('pensieri', { testo: val('f-testo'), anchor_tipo: val('f-anct') || null, anchor_id: val('f-anci') ? +val('f-anci') : null, data: store.today() }); }
  if (t === 'adhkar') { if (!val('f-nome')) { toast('Serve il nome'); return; } store.add('adhkar', { nome: val('f-nome'), momento: val('f-mom'), rip: val('f-rip'), arabo: val('f-ar'), traduzione: val('f-tr'), versetto_id: val('f-v') ? +val('f-v') : null, hadith_id: val('f-h') ? +val('f-h') : null }); }
  if (t === 'versetto') { if (!val('f-tr')) { toast('Serve la traduzione'); return; } store.add('versetti', { sura_id: +val('f-sura'), numero: +val('f-num') || 0, arabo: val('f-ar'), traduzione: val('f-tr'), contesto: val('f-ctx'), nota: '' }); }
  if (t === 'hadith') { if (!val('f-testo')) { toast('Serve il testo'); return; } store.add('hadith', { testo: val('f-testo'), raccolta: val('f-racc'), numero_rif: val('f-rif'), grado: val('f-grado'), narratore_id: null, isnad: '', nota: val('f-nota') }); }
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

/* ---- avvio ---- */
renderPage('oggi'); counts(); applyI18n(); applySezioni();

/* PWA: registra il service worker se servita via http(s) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
