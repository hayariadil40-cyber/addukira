# Addukira — determinazione del front

Il front va reso **speculare** allo schema di `SCHEMA.md`: ogni pagina sa quale
entità legge, quale scrive, e quali collegamenti mostra. Quando l'SQL arriva,
`store.js` cambia sorgente e nient'altro si muove.

Ordine di lavoro concordato:
**1. determinazione front + collegamenti** ← *siamo qui*
**2.** costruzione SQL + test collegamenti
**3.** pulizia del DB
**4.** import (Corano completo + migrazione contenuti Notion)

---

## Mappa pagina → entità

`A` = canonico (lettura pubblica) · `B` = personale (RLS)

| Pagina | Legge | Scrive |
|---|---|---|
| **Oggi** | `adhkar`ᴬ `adhkar_utente`ᴮ `spunte`ᴮ `khatam`ᴮ `ayat`ᴬ `ricorrenze`ᴬ `impostazioni`ᴮ `luoghi`ᴮ | `spunte` |
| **Lettura** | `khatam`ᴮ `ayat`ᴬ `ayat_traduzioni`ᴬ `sure`ᴬ `evidenziazioni`ᴮ | `khatam` `evidenziazioni` `pensieri` |
| **Memorizzazione** | `ayat`ᴬ `sure`ᴬ `memorizzazione`ᴮ `piano_studio`ᴮ | `memorizzazione` `piano_studio` |
| **Pensieri** | `pensieri`ᴮ `legami`ᴮ | `pensieri` `legami` |
| **Allah** | `asma`ᴬ `legami` | `pensieri` `legami` |
| **Corano** | `sure`ᴬ `ayat`ᴬ `ayat_traduzioni`ᴬ | — |
| **Hadith** | `hadith`ᴬ `fonti`ᴬ | — (redazione) |
| **Personaggi · Storie · Temi · Fiqh · Azioni · Segni · Creazione · Luoghi** | `voci`ᴬ (filtrate per `tipo`) `fonti`ᴬ | — (redazione) |
| **Impostazioni** | `impostazioni`ᴮ `luoghi`ᴮ | entrambe |
| **Ricerca** | tutto `A` + `pensieri`ᴮ | — |
| **Dettaglio** | l'entità + `legami` | `pensieri` `legami` |

**Otto pagine leggono la stessa tabella.** Questa è la conseguenza pratica di
`voci`: un solo motore parametrizzato per `tipo`, non otto renderer. Oggi
`STUDIO_PAGES` lo fa già per quattro (azioni, segni, creazione, luoghi);
personaggi, storie, temi e fiqh vanno portate dentro lo stesso motore.

---

## I collegamenti che il front deve saper mostrare

Tutto passa da `legami`. Due direzioni, due nature:

| Blocco UI | Query | Dove appare |
|---|---|---|
| **«Pensieri nati qui»** | `legami` dove `a = questa entità`, `da_tipo = pensiero`, `user_id = me` | ogni dettaglio |
| **«Collegato a»** | `legami` canonici (`user_id IS NULL`) da e verso questa entità | ogni dettaglio |
| **«Nato da»** | il legame inverso, dal pensiero verso l'ancora | pagina Pensieri |
| **«Discende da questa fonte»** | `voci` + `hadith` con `fonte_id` = questa fonte | dettaglio sapiente/opera |
| **«Contiene»** | `voci` con `parent_id` = questa voce | dettaglio fiqh e trattati |

Il dettaglio oggi mostra solo «Pensieri nati qui», e solo per versetto e asma.
Deve diventare un **blocco unico riusabile**, identico per qualunque entità.

---

## Lo scarto: cosa va cambiato nel front

### A · Un solo motore per `voci` — *sostanziale*
`renderPeople`, `renderHadith` e le tre righe secche di `stories`/`themes`/`fiqh`
(`app.js:808-810`) confluiscono nel motore di `renderStudio`, che già gestisce
ricerca + categorie + griglia + dettaglio. Le differenze vere (le sezioni dei
Personaggi, il grado degli Hadith) restano come configurazione del tipo, non
come codice separato.

### B · La gerarchia — *sostanziale*
Con `voci.parent_id`, Fiqh non è una griglia: è un albero. Serve un renderer ad
albero, e il dettaglio deve mostrare «contiene» e il percorso dei genitori.
Vale per tutti i trattati, non solo il fiqh.

### C · Gli id diventano uuid — *meccanico ma pervasivo, e rompe tutto se ignorato*
Oggi il markup genera `onclick="openDetail('versetto',${v.id})"` con id
numerici. Con gli uuid quella riga produce
`openDetail('versetto',a1b2c3d4-...)` — **JavaScript non valido**, la pagina
smette di rispondere. Ogni handler inline va quotato:
`openDetail('versetto','${v.id}')`.

Contate: **20 occorrenze** in `app.js`. Diciannove diventano uuid e vanno
quotate; l'unica che resta intera è `quranPickSura(${s.id})`, perché la sura
mantiene la chiave naturale 1–114. Da fare *prima* della migrazione, non
durante: è invisibile finché gli id sono numeri, e rompe tutto insieme il
giorno del passaggio.

### D · `sure.id` → `sure.numero`
Sparisce la doppia numerazione. `suraOf()` e `_ayaIndex()` tornano a parlare
della stessa cosa. Con `ayat.id` globale 1–6236 la percentuale del khatam
diventa una divisione invece di un ciclo.

### E · Pensieri: da un'ancora a molte
`anchor_tipo`/`anchor_id` diventano righe di `legami`. Il modale deve
permettere più collegamenti; `anchorLabel()` deve rendere una lista.

### F · Ricorrenze in Oggi
`widgets.js:93` calcola i giorni bianchi a mano dalla fase lunare e non sa
nulla di Ramadan, ʿĀshūrāʾ o Notte del Destino. Con `ricorrenze` la pagina
Oggi mostra cosa cade oggi e cosa si avvicina.

### G · Il giorno nel fuso giusto
`store.today()` (`store.js:281`) usa `toISOString()` = UTC. Va calcolato nel
fuso dell'utente prima che `spunte` diventi una tabella con una PK sulla data.

### H · Bilingue IT/AR
Ogni pagina che tocchiamo nasce con le chiavi `i18n` e con CSS a proprietà
logiche (`margin-inline`, `text-align:start`), non tradotta dopo. Requisito
non negoziabile: l'app deve essere usabile in solo arabo.

---

## L'API che `store.js` deve esporre

Il contratto tra `app.js` e i dati. Se lo fissiamo ora, il passaggio a Supabase
non tocca `app.js`.

```
store.voci(tipo, {categoria, q, parent})   → lista filtrata
store.voce(id)                             → una voce + genitore + figli
store.legami(tipo, id, {verso})            → collegamenti in entrambe le direzioni
store.pensieriDi(tipo, id)                 → «Pensieri nati qui»
store.collega(da, a, relazione)            → crea un legame
store.aya(id) / store.ayat({sura, hizb})   → Corano
store.fonte(id) / store.discendenti(id)    → fonti e ciò che ne deriva
store.ricorrenzeDi(data)                   → cosa cade oggi
```

Le funzioni esistenti (`list`, `get`, `add`, `toggle`, `lettura`, `khatam*`,
`isMem`, `isHl`) restano: cambia solo cosa c'è sotto.

---

## Ordine proposto per il front

1. **Igiene preventiva**: quotare gli id negli handler inline (C), sistemare
   `store.today()` (G). Invisibile ora, salva la migrazione dopo.
2. **Motore `voci` unico** (A): assorbire personaggi, storie, temi, fiqh.
3. **Albero** (B): la gerarchia, provata sul fiqh.
4. **Blocco collegamenti riusabile**: «Pensieri nati qui» + «Collegato a» +
   «Contiene» su ogni dettaglio.
5. **Pensieri a legami multipli** (E).
6. **Ricorrenze in Oggi** (F).
7. **Bilingue** (H) — dentro ognuno dei passi sopra, non alla fine.

Solo quando questi sette punti sono chiusi il front è «in grado di ricevere
dati»: allora si scrive l'SQL, si testano i collegamenti, si pulisce e si
importa.

---

## Lettura assistita (implementata 18 ago 2026, joystick 18 ago sera)

Due modalità, scelte dal pannello sul chip della barra (salvate in
`impostazioni.vista.lettoreAuto.modo`, default `joystick`):

**Joystick** (principale): tieni premuto ⇕ e il testo scorre alla velocità
di crociera (`lettoreAuto.vel`, cursore 1–10); il punto di presa è lo zero —
trascini in giù e accelera (fino a ×8), risali e frena, sopra lo zero
retromarcia dolce, lasci e si ferma. Pointer events con `setPointerCapture`
+ `touch-action:none`. La barra vive in un host su `body`
(`#lettore-ui-host`, visibile via `body.con-lettore`), NON dentro
`#p-lettura`: i re-render della pagina (sentinella inclusa) non strappano
il bottone tenuto premuto.

**Automatico** (secondaria, per le mani libere): avanza **per āya, non per
pixel** — illumina un versetto (`.leggendo`), centra la vista, aspetta in
proporzione alla lunghezza (spv × parole/12, minimo 2.5s, **senza tetto**)
e passa al successivo. Ritmo `lettoreAuto.spv`, cursore 2–20s. Regole:

- **qualsiasi tocco durante il play = solo pausa** (listener in capture:
  nessun bottone scatta per sbaglio);
- in pausa la barra offre **«⛿ segna qui»**: l'āya illuminata diventa il
  segnalibro;
- con un piano khatam attivo il play **si ferma da solo al traguardo del
  giorno** (`pianoKhatam().target`);
- wake lock durante il play; pausa automatica se la pagina va in background
  o si naviga altrove;
- il motore ritrova la sua riga via `data-idx` (indice globale 1–6236 =
  `ayat.id`) dopo ogni re-render, e carica i versetti mancanti da solo
  (serializzato con la sentinella via `lpInCorso`).

La barra flottante porta anche i salti rapidi: **↑ torna in cima** e
**⛿ vai al segnalibro** — se il segnalibro è fuori dalla finestra caricata
la ricarica attorno a lui (`caricaAyat`), senza riavviare l'app. Sta sopra
la safe-area iPhone (`env(safe-area-inset-bottom)`, richiede
`viewport-fit=cover` nella meta viewport) per non collidere con la barra
di casa/Siri. Funziona in Flusso e in Pagina (gli span `.mv` hanno lo
stesso `data-idx`). Un domani il motore per āya si aggancia all'audio del
qari: è già l'unità giusta.

---

## Memorizzazione: piani multipli, completamento, voce di Ḥuṣarī (18 ago 2026)

**Il principio:** le āyat memorizzate vivono in `memorizzazione`, FUORI dai
piani. Sospendere o eliminare un piano non ne tocca nemmeno una, e la
percentuale del Corano in alto è sempre l'unione di tutto lo studiato.

**Piani in corso anche più d'uno** (`pianiMemAttivi`): un blocco per
ciascuno nel pannello; col tocco si seleziona quello che comanda grafico,
statistiche e testo di studio. «＋ Nuovo piano in parallelo» apre il form.
Ogni piano ha un perimetro (`progressoPiano`):
- *sure scelte* → contano solo le āyat dentro quelle sure, in qualunque
  momento segnate (una sospensione non perde nulla);
- *tutto il Corano* → il totale assoluto;
- *juz/ḥizb/versetti* → quantità senza perimetro, conta ciò che si è
  aggiunto dalla `base` del piano.

**Completamento:** `controllaPianiMem()` gira a ogni render della pagina —
un piano che raggiunge la sua meta passa da solo a `completato` (con
`completato_il`), festa nel toast e riga nello storico «Completati» con
durata, ritmo e anticipo/ritardo (`durataPianoMem`). Sospesi e completati
sono sempre visibili in fondo alla pagina.

**Recitazione (Ḥuṣarī):** barra audio (`recUiHtml`) sopra il testo di
studio — ▶/⏸, ⏮ ⏭, ripetizioni ×1/×3/×5/×10 per āya, 🔁 loop sul passo.
L'āya in ascolto si illumina (`.leggendo`, `data-idx` scopato per pagina:
`#p-lettura […]` vs `#p-memorizzazione […]`). URL in `store.js`:
`audioUrlAya(id)` → `cdn.islamic.network/quran/audio/128/ar.husary/<id>.mp3`
(l'id dell'aya È il numero globale 1–6236), con riserva automatica su
`everyayah.com` (stessa registrazione) al primo errore di rete. La voce si
ferma cambiando pagina e riprende da dov'era. Un domani: qari nelle
impostazioni (`impostazioni.audio.qari`, c'è già `ar.husarymujawwad`) e
cache offline del passo in studio via service worker.
