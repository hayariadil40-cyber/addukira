/* ============================================================
   WIDGETS — arco del giorno (sole + orari preghiera), marea, luna.
   Dati d'esempio (orari preghiera / marea): al passo Supabase
   arriveranno dalla posizione + API, chiave lato server.
   markup() → HTML ·  mount() → disegna e avvia l'aggiornamento.
   ============================================================ */
const Widgets = (() => {
  const $id = i => document.getElementById(i);
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.round(m) % 60).padStart(2, '0');

  /* ---- CIELO: arco del sole + orari di preghiera (esempio) ---- */
  const P = [
    { k: 'Fajr', key: 'fajr', t: 230, n: 1 }, { k: 'Shurūq', key: 'shuruq', t: 340, sr: 1 },
    { k: 'Ẓuhr', key: 'zuhr', t: 800 }, { k: 'ʿAṣr', key: 'asr', t: 1035 },
    { k: 'Maghrib', key: 'maghrib', t: 1255, ss: 1 }, { k: 'ʿIshāʾ', key: 'isha', t: 1355, n: 1 },
  ];
  const SR = 340, SS = 1255, CX = 200, CY = 112, R = 88;
  const pos = t => { const f = Math.min(1, Math.max(0, (t - SR) / (SS - SR))), a = Math.PI * (1 - f); return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }; };

  function drawArc() {
    const S = store.getSettings(), T = S.tempo, PR = S.preghiere;
    const m = store.nowMin(T.fuso), day = m >= SR && m <= SS;
    /* preghiere visibili, con correzione in minuti applicata */
    const vis = P.filter(pr => PR.mostra[pr.key]).map(pr => ({ ...pr, t: pr.t + (PR.correzioni[pr.key] || 0) }));
    let s = `<path d="M${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}" fill="none" stroke="rgba(246,241,228,.16)" stroke-width="1.5"/>`;
    if (day) { const p = pos(m); s += `<path d="M${CX - R} ${CY} A ${R} ${R} 0 0 1 ${p.x} ${p.y}" fill="none" stroke="#b08d46" stroke-width="2"/>`; }
    s += `<line x1="14" y1="${CY}" x2="386" y2="${CY}" stroke="rgba(246,241,228,.28)"/>`;
    vis.forEach(pr => {
      if (pr.n) {
        const x = pr.t < SR ? 58 : 344;
        s += `<circle cx="${x}" cy="${CY + 15}" r="3.2" fill="none" stroke="#d3b573" stroke-width="1.3"/><text x="${x}" y="${CY + 32}" text-anchor="middle" fill="rgba(246,241,228,.7)" font-size="10" font-family="Inter">${pr.k}</text>`;
        return;
      }
      const p = pos(pr.t), done = m >= pr.t;
      s += `<circle cx="${p.x}" cy="${p.y}" r="${pr.sr || pr.ss ? 3 : 4}" fill="${done ? '#d3b573' : '#0f1e1a'}" stroke="#d3b573" stroke-width="1.4"/>`;
      if (!pr.sr && !pr.ss) s += `<text x="${p.x}" y="${p.y - 11}" text-anchor="middle" fill="rgba(246,241,228,.8)" font-size="10" font-family="Inter">${pr.k}</text>`;
    });
    if (day) { const p = pos(m); s += `<circle cx="${p.x}" cy="${p.y}" r="12" fill="#d3b573" opacity=".18"/><circle cx="${p.x}" cy="${p.y}" r="6.5" fill="#e8c87e"/>`; }
    $id('w-arc').innerHTML = s;
    $id('w-now').textContent = store.fmtHM(m);
    const past = [...vis].filter(p => p.t <= m).pop();
    $id('w-state').textContent = past ? past.k + ' passato' : (vis.length ? 'prima di ' + vis[0].k : '—');
    if (vis.length) { const nx = vis.find(p => p.t > m) || vis[0]; let df = nx.t - m; if (df < 0) df += 1440; $id('w-next').textContent = `▸ prossima: ${nx.k} tra ${Math.floor(df / 60)}h ${df % 60}m`; }
    else $id('w-next').textContent = '—';
    /* orologi affiancati (fusi extra) */
    $id('w-clocks').innerHTML = T.fusi_extra
      .map(tz => `<span class="tzc">${tz.split('/').pop().replace('_', ' ')} ${store.fmtHM(store.nowMin(tz))}</span>`)
      .join('');
  }

  /* ---- MAREA (dati d'esempio) ---- */
  const TIDES = [
    { t: 4 * 60 + 10, type: 'alta', h: 1.42 }, { t: 10 * 60 + 25, type: 'bassa', h: .21 },
    { t: 16 * 60 + 48, type: 'alta', h: 1.55 }, { t: 22 * 60 + 55, type: 'bassa', h: .18 },
  ];
  function drawTide() {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    const nx = TIDES.find(t => t.t > m) || TIDES[0]; let df = nx.t - m; if (df < 0) df += 1440;
    $id('w-tide-time').textContent = hhmm(nx.t);
    $id('w-tide-lab').textContent = `marea ${nx.type} · ${nx.h.toFixed(2)} m`;
    $id('w-t-now').textContent = `tra ${Math.floor(df / 60)}h ${df % 60}m`;
    const after = TIDES[(TIDES.indexOf(nx) + 1) % TIDES.length];
    $id('w-t-then').textContent = `poi ${after.type} ${hhmm(after.t)}`;
    let pts = ''; for (let i = 0; i <= 200; i += 4) {
      const mm = i / 200 * 1440, y = 22 - 15 * Math.sin((mm - TIDES[0].t) / 372 * Math.PI);
      pts += `${i},${y.toFixed(1)} `;
    }
    const cx = m / 1440 * 200, cy = 22 - 15 * Math.sin((m - TIDES[0].t) / 372 * Math.PI);
    $id('w-wave').innerHTML =
      `<polyline points="${pts}" fill="none" stroke="#4a7f8c" stroke-width="1.6" opacity=".55"/>
       <line x1="0" y1="22" x2="200" y2="22" stroke="rgba(22,40,31,.15)" stroke-dasharray="2 3"/>
       <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.4" fill="#4a7f8c"/>`;
  }

  /* ---- LUNA: terminatore reale ---- */
  const SYN = 29.530588853, NEW0 = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const phaseNow = () => (((Date.now() / 86400000 - NEW0) / SYN) % 1 + 1) % 1;
  function drawMoon() {
    const p = phaseNow(), th = 2 * Math.PI * p, r = 36;
    const k = (1 - Math.cos(th)) / 2;
    const sign = p < 0.5 ? 1 : -1;
    let d = '';
    for (let i = 0; i <= 48; i++) { const a = -Math.PI / 2 + i * Math.PI / 48; d += (i ? 'L' : 'M') + (sign * r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2); }
    for (let i = 48; i >= 0; i--) { const a = -Math.PI / 2 + i * Math.PI / 48; d += 'L' + (sign * r * Math.cos(th) * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2); }
    d += 'Z';
    $id('w-moon').innerHTML =
      `<circle r="${r}" fill="#1b2c24"/><path d="${d}" fill="#e6dcc0"/><circle r="${r}" fill="none" stroke="rgba(211,181,115,.45)" stroke-width="1"/>`;
    const names = ['Nuova', 'Falce crescente', 'Primo quarto', 'Gibbosa crescente', 'Piena', 'Gibbosa calante', 'Ultimo quarto', 'Falce calante'];
    $id('w-phase').textContent = names[Math.round(p * 8) % 8];
    $id('w-ill').textContent = Math.round(k * 100) + '% illuminata';
    const gh = Math.floor(p * SYN) + 1;
    $id('w-hij').textContent = gh + ' del mese lunare';
    $id('w-bianchi').textContent = (gh >= 13 && gh <= 15)
      ? '✦ Giorni bianchi — digiuno consigliato oggi'
      : `Giorni bianchi (13–15) tra ${((13 - gh) + 30) % 30} giorni`;
  }

  function markup() {
    return `<div class="stack">
      <div class="sky" id="w-sky">
        <div class="sky-top"><div class="now" id="w-now">—</div><div class="state" id="w-state">—</div></div>
        <div class="sky-clocks" id="w-clocks"></div>
        <svg viewBox="0 0 400 150" id="w-arc" aria-label="Arco del giorno e orari di preghiera"></svg>
        <div class="sky-foot" id="w-next">—</div>
      </div>
      <div class="duo">
        <div class="card" id="w-tide-card">
          <div class="k"><span>Marea</span><span class="loc" id="w-loc">📍 la tua posizione</span></div>
          <div class="big" id="w-tide-time">—</div>
          <div class="lab" id="w-tide-lab">—</div>
          <svg viewBox="0 0 200 44" class="tide-wave" id="w-wave"></svg>
          <div class="tide-next"><span id="w-t-now">—</span><span id="w-t-then">—</span></div>
        </div>
        <div class="card" id="w-moon-card">
          <div class="k"><span>Luna</span><span class="loc" id="w-ill">—</span></div>
          <div class="moon-wrap">
            <svg width="74" height="74" viewBox="-42 -42 84 84" id="w-moon"></svg>
            <div><div class="big" style="font-size:17px" id="w-phase">—</div><div class="hijri" id="w-hij">—</div></div>
          </div>
          <div class="bianchi" id="w-bianchi">—</div>
        </div>
      </div>
    </div>`;
  }

  let started = false;
  const draw = () => { drawArc(); drawTide(); drawMoon(); };
  function mount() {
    draw();
    if (!started) { started = true; setInterval(draw, 60000); }
  }
  /* ridisegna su richiesta (dopo un cambio impostazioni), solo se montato */
  const refresh = () => { if (document.getElementById('w-arc')) draw(); };

  return { markup, mount, refresh };
})();
