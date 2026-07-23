# Al-Maktaba · المكتبة

Archivio personale di studio dell'Islam + compagno quotidiano.
**v1 — scheletro front-end.** Dati salvati in locale (localStorage); al passo 2 lo strato dati (`js/store.js`) passa a Supabase senza toccare l'interfaccia.

## Come avviarla

Apri `index.html` nel browser — funziona già così.

Meglio (necessario per la PWA/service worker): servila in locale:

```bash
npx serve .
# oppure
python3 -m http.server 8000
```

e apri http://localhost:8000 (o :3000 con serve).

## Struttura

```
index.html            markup e shell dell'app
css/style.css         design system (verde notturno · pergamena · ottone)
js/store.js           STRATO DATI — l'unico file che parlerà con Supabase
js/app.js             rendering, navigazione, ricerca, modale
manifest.webmanifest  PWA: nome, icona, colori
sw.js                 service worker minimo (cache shell)
icons/icon.svg        icona dell'app
```

## Architettura in una riga

`app.js` non sa dove vivono i dati: chiama solo `store.*`.
Oggi `store.js` legge/scrive localStorage; al passo 2 le stesse funzioni
chiameranno Supabase (`supabase.from('...')`). L'interfaccia non cambia.

## Roadmap

- **v1** — questa base + Supabase + deploy (Vercel/Netlify) + PWA installabile
- **v1.1** — Dashboard home: statistiche, ricerca rapida, orari preghiera
- poi — import Corano completo (6.236 aya), migrazione 536 promemoria adhkār via MCP
