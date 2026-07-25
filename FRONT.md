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
