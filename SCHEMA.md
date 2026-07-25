# Addukira — modello dati

Documento di progettazione dello schema Supabase. Nasce dalla lettura di
`js/store.js` (modello reale in localStorage) e `js/app.js` (come viene usato).
Da qui si genera l'SQL, in un colpo solo.

> **Documento vivo. Nessun SQL finché il front non è finito.**
> Si sistema prima il front-end pagina per pagina; ogni volta che una pagina
> chiede un dato che qui non c'è, si annota nel registro in fondo e si va
> avanti. Quando il front è completo si rilegge tutto, si consolida lo schema
> e si scrive **una** migration sola.
> Motivo: una pagina disegnata sul serio scopre campi che nessuna
> progettazione a tavolino indovina, e ogni migration parziale è debito.

---

## Registro dei requisiti raccolti dal front

Man mano che si lavora sulle pagine. Data · pagina · cosa serve · dove impatta.

| data | fonte | requisito emerso | impatto sullo schema |
|---|---|---|---|
| 2026-07-25 | `store.js` | prima stesura dallo stato attuale | 17 tabelle, due layer |
| 2026-07-25 | Notion `Islam` | **FIQH è gerarchico** (Purificazione → ṭahāra → ḥadath → wuḍūʾ, 3-4 livelli) | `voci.parent_id` — una voce contiene voci |
| 2026-07-25 | Notion `Islam` | **calendario islamico assente**: Ramadan, Shawwāl, Dhū al-Ḥijjah, ʿĀshūrāʾ, Notte del Destino, giorni bianchi | nuova tabella `ricorrenze` |
| 2026-07-25 | Notion `Islam` | **le fonti sono entità**: Ibn Kathīr → *Storie dei Profeti*; al-Albānī; Mālik | nuova tabella `fonti` + `fonte_id` al posto del text libero |
| 2026-07-25 | Notion `Islam` | «Credente · Miscredente · Ipocrita» sono **categorie teologiche**, non personaggi | nuovo `voci.tipo = 'tipo_umano'` |
| 2026-07-25 | Notion `Islam` | appunti grezzi (Bozze, RIFLESSIONI, Appunti della settimana) in attesa di maturare | `pensieri.stato` grezzo→lavorato→migrato |
| 2026-07-25 | Notion `Corano` db | colonna «Leggere» = tracking lettura per sura | conferma `khatam`, nessuna modifica |
| 2026-07-25 | pagina Oggi | attività fatta **o saltata**, e saltata da sola se passa il suo orario | `spunte.stato` a 3 valori invece del booleano |
| 2026-07-25 | pagina Azioni | **le azioni sono il magazzino**: da un hadith → azione → attività quotidiana | `attivita.azione_id`; `azioni` non è più scheda inerte |
| 2026-07-25 | pagina Azioni | stesso meccanismo per i peccati, con bottone «da evitare» | `attivita.verso` = `fare`\|`evitare` |
| 2026-07-25 | pagina Azioni | servono inizio, fine, ricorrenza, orario, attiva/spenta | `attivita`: 8 colonne nuove |
| 2026-07-25 | ragionamento | «dopo Maghrib» è un evento mobile, non un orario | `attivita.ancora` + `preghiera` + `offset_min` |
| 2026-07-25 | ragionamento | giorni bianchi, Shawwāl, ʿĀshūrāʾ ricorrono nel **calendario hijri** | `attivita.ricorrenza` jsonb con tipi `*_hijri` |
| 2026-07-25 | pagina Lettura | il khatam si dà un **periodo** e va frazionato in parti uguali | `khatam.iniziato_il` · `scadenza` · `completato_il` |
| 2026-07-25 | pagina Lettura | «Ferma» ed «Elimina» erano identici: mancava il ritorno | `khatam.stato = 'sospeso'` riprendibile |
| 2026-07-25 | pagina Lettura | marcatori juz nel flusso | risolto in costante (30 confini), nessuna colonna |
| 2026-07-25 | pagina Lettura | marcatori **pagina** del muṣḥaf: bloccati finché il dato non c'è | `ayat.pagina` — requisito, non opzionale |
| 2026-07-25 | pagina Memorizzazione | senza data non esiste nessuna statistica di ritmo | `memorizzazione.data` per ogni versetto |
| 2026-07-25 | pagina Memorizzazione | piano con obiettivo e periodo, **uno solo attivo** | nuova tabella `piani_mem` |
| 2026-07-25 | pagina Memorizzazione | obiettivo in juz/ḥizb/versetti o **sure scelte** (conteggio esatto) | `piani_mem.obiettivo_tipo` + `obiettivo_n` |
| 2026-07-25 | decisione | riwāya **Ḥafṣ** (Warsh scartata: numerazione diversa, nessun tajwīd annotato) | `ayat.tajweed` jsonb da `cpfair/quran-tajweed` |

---

## Il principio che regge tutto

Due layer, separati in modo netto:

**Layer A — CANONICO.** Il Corano, i Nomi, gli hadith, le schede di studio.
È lo stesso per chiunque, non appartiene a nessun utente, non si modifica
per uso quotidiano. Lettura pubblica, scrittura solo di chi cura l'archivio.

**Layer B — PERSONALE.** Pensieri, khatam, segnalibri, spunte, memorizzazione,
evidenziazioni, impostazioni. Datato, privato, uno per utente.
`user_id` + Row Level Security su ogni tabella.

Il confine non è estetico: decide chi può scrivere cosa, e permette che il
Corano stia in memoria una volta sola invece che copiato per ogni utente.

---

## Quattro correzioni al modello attuale

| # | Difetto oggi | Nel DB |
|---|---|---|
| 1 | `sure.id` (1,2,3,4) ≠ `sure.numero` (2,7,12,114) — due numerazioni convivono | `sure.numero` è la PK, 1–114. Chiave naturale, nessun id surrogato |
| 2 | `store.today()` usa `toISOString()` = UTC. A Casablanca (UTC+1) una spunta alle 00:30 finisce nel giorno prima | il giorno si calcola nel fuso dell'utente, mai in UTC |
| 3 | Zero timestamp. Nessuna data su `khatam` (iniziato/completato) | `creato_il` / `modificato_il` ovunque; date esplicite sui khatam |
| 4 | Collegamenti in 4 forme diverse (`anchor_tipo/anchor_id`, `versetto_id`, `hadith_id`, `sura_id`) e nessuna integrità | una tabella `legami` unica |

Nota su (2): resta aperta la domanda se il giorno di Addukira debba iniziare a
mezzanotte locale o al **maghrib**. Vedi «Decisioni aperte» in fondo.

---

## Chiavi: perché uuid

Il canonico usa chiavi naturali dove esistono: `sure.numero` 1–114,
`ayat.id` 1–6236, `asma.numero` 1–99. Sono stabili per definizione.

Tutto il resto usa **uuid**. L'app è offline-first: `store.js` scrive in
localStorage e sincronizzerà dopo. Con uuid il client genera l'id da solo,
senza aspettare il server e senza rischio di collisione al momento del merge.
Con bigint seriali quella sincronizzazione diventa un problema.

---

# Layer A — Canonico

## `sure` · 114 righe

| colonna | tipo | note |
|---|---|---|
| `numero` | int PK | 1–114 |
| `nome_arabo` | text | الفاتحة |
| `translit` | text | Al-Fātiḥa |
| `titolo_it` | text | L'aprente |
| `n_versetti` | int | |
| `rivelazione` | text | `meccana` \| `medinese` |
| `ordine_rivelazione` | int | ordine cronologico, ≠ ordine del muṣḥaf |
| `pagina_inizio` | int | pagina del muṣḥaf (604) |

## `ayat` · 6236 righe

| colonna | tipo | note |
|---|---|---|
| `id` | int PK | indice globale 1–6236 |
| `sura` | int FK → `sure.numero` | |
| `numero` | int | aya dentro la sura |
| `testo_ar` | text | con tashkīl |
| `testo_ar_ricerca` | text | senza diacritici, per la ricerca |
| `pagina` | int | 1–604 |
| `juz` | int | 1–30 |
| `hizb` | int | 1–60 |
| `thumn` | int | 1–8, ottava dentro il ḥizb |
| `sajda` | bool | versetto di prosternazione |
| `tajweed` | jsonb | annotazioni per il testo colorato (vedi sotto) |

UNIQUE(`sura`, `numero`). Indice full-text su `testo_ar_ricerca`.

### Riwāya: Ḥafṣ ʿan ʿĀṣim — deciso il 2026-07-25

Warsh sarebbe stata la scelta naturale per il Marocco, ma è stata scartata dopo
verifica: non è una variante grafica, è una **riwāya diversa**. Cambia la
numerazione dei versetti (computo medinese invece di quello kufano, quindi
`VERSI_SURA` e il totale 6236 non valgono), cambia l'impaginazione dei muṣḥaf
marocchini rispetto alle 604 pagine di Medina, e soprattutto **non esistono
dati di tajwīd annotati** per Warsh.

Con Ḥafṣ esiste tutto, pronto e allineato:

| Cosa | Fonte |
|---|---|
| testo Uthmani + metadati | Tanzil · Quranpedia (`page_number` incluso) |
| 604 pagine, font QCF | Quranpedia distribuisce font e immagini di pagina |
| **tajwīd annotato** | `cpfair/quran-tajweed` — 19 regole con indici di carattere |

### `tajweed` — come si colora il testo

Il dataset dà, per ogni aya, gli intervalli esatti di codepoint:

```json
[ { "rule": "madd_6", "start": 245, "end": 247 },
  { "rule": "ikhfa",  "start": 12,  "end": 14  } ]
```

Colorare diventa applicare gli intervalli al testo: nessun calcolo di regole
lato nostro. **Gli offset sono ancorati al testo Uthmani di Tanzil**: se un
giorno si cambia edizione del testo, le annotazioni vanno riallineate.

Sta in JSONB dentro `ayat` invece che in tabella propria perché si legge
sempre e solo insieme alla sua aya, e sono pochi intervalli per riga. Se un
domani servisse cercare *per regola* («tutti i madd muttasil»), diventerà una
tabella `tajweed_annotazioni`.

**Perché `id` globale 1–6236:** oggi `_ayaIndex()` (store.js:292) somma in un
ciclo i versetti di tutte le sure precedenti per calcolare la percentuale.
Con l'indice globale la percentuale è `id / 6236`, una divisione.

**Perché `pagina`/`juz`/`hizb`/`thumn` in colonna:** la pagina Memorizzazione
li stima oggi con `hizbPages()` e `ottavaPages()` (app.js:241-246), dichiarati
«approssimata, in bozza». Sono dati reali del muṣḥaf: appartengono al DB, non
a una formula.

**Perché `sajda`:** l'app lo promette già all'utente («Quando arrivi a un'aya
col simbolo ۩, l'app mostrerà la tua dua del sujūd», app.js:198) senza avere
il dato per mantenerlo.

## `ayat_traduzioni`

| colonna | tipo | note |
|---|---|---|
| `aya_id` | int FK → `ayat.id` | |
| `lang` | text | `it` \| `ar` \| `fr` … |
| `traduttore` | text | Hamza Piccardo, Bausani… |
| `testo` | text | |

PK(`aya_id`, `lang`, `traduttore`).

Tabella separata e non colonna in `ayat`: così IT e AR convivono, se ne
aggiungono altre senza toccare lo schema, e puoi confrontare due traduzioni
dello stesso versetto — cosa che in un archivio di studio serve davvero.

### ⚠ Questa tabella NON è a lettura pubblica

È l'unica eccezione al Layer A. La traduzione italiana in uso è quella di
**Hamza Roberto Piccardo**, protetta da copyright (licenza Al-Hikma / Newton
Compton). L'uso è **strettamente personale**: l'utente, sua moglie, un cugino.

Il problema tecnico: il sito è pubblicato su **GitHub Pages** e la chiave
`anon` di Supabase vive dentro il codice del browser, quindi è nota a chiunque.
Se `ayat_traduzioni` avesse la stessa policy di lettura pubblica delle altre
tabelle canoniche, **chiunque potrebbe interrogarla e scaricare la traduzione
intera** — e quella sarebbe diffusione al pubblico, non uso personale.

Regole, non negoziabili:

1. RLS su `ayat_traduzioni`: lettura **solo per utenti autenticati**
   (`auth.role() = 'authenticated'`), mai per `anon`.
2. Il testo della traduzione non deve **mai** comparire in un file versionato:
   né in `js/`, né in un `seed.sql`, né in un JSON di dati. L'import è un
   caricamento una tantum verso il database, non uno script committato.
3. Il testo **arabo** resta pubblico: è di pubblico dominio.

La colonna `traduttore` non è un dettaglio: l'utente ha in programma, nell'arco
di 10-20 anni, una **propria traduzione**. Quando esisterà starà in questa
stessa tabella accanto a Piccardo, e le due si potranno leggere affiancate —
che è esattamente lo strumento che serve a chi traduce.

## `asma` · 99 righe

`numero` PK 1–99 · `arabo` · `translit` · `significato` · `spiegazione` (testo
lungo) · `aya_id` FK nullable (dove il Nome compare nel Corano).

Oggi sono 14 su 99, dichiarati bozza in `renderAllah()`.

## `hadith`

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `testo_ar` | text | oggi manca del tutto: c'è solo la traduzione |
| `testo_it` | text | |
| `raccolta` | text | Bukhari, Muslim, Tirmidhī… |
| `numero_rif` | text | «Bukhari 2736» |
| `grado` | text | `sahih`\|`hasan`\|`daif`\|`qudsi`\|`non_verificato` |
| `isnad` | text | catena di trasmissione |
| `narratore_id` | uuid FK → `voci.id` | esiste già in `store.js`, mai usata |
| `nota` | text | |

Tabella propria e non dentro `voci`: ha una struttura sua e forte
(raccolta + riferimento + grado + isnād) che merita colonne tipizzate.
Il `grado` in particolare è un giudizio scientifico, non un tag.

## `voci` — le schede di studio

Una sola tabella per: **personaggi, storie, temi, fiqh, azioni, segni dell'Ora,
creazione, luoghi**.

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `tipo` | text | `personaggio`\|`storia`\|`tema`\|`fiqh`\|`azione`\|`segno_ora`\|`creazione`\|`luogo`\|`tipo_umano`\|`pilastro` |
| `categoria` | text | dentro il tipo: `sahaba`, `maggiore`, `sacro`, `peccato`, `madhab`… |
| **`parent_id`** | **uuid FK → `voci.id`** | **auto-riferimento: una voce contiene voci** |
| `titolo` | text | |
| `arabo` | text | nome o titolo in arabo |
| `sommario` | text | una riga, per la card |
| `corpo` | text | il testo lungo: biografia, riassunto, contenuto |
| `fonte_id` | uuid FK → `fonti.id` | |
| `riferimento` | text | pagina/capitolo dentro la fonte |
| `dati` | jsonb | extra specifici del tipo |
| `slug` | text | per gli URL |
| `ordine` | int | ordinamento tra fratelli |

**`parent_id` è obbligatorio, non un lusso.** Il FIQH del Notion è un trattato a
3-4 livelli: *Regole della Purificazione → la ṭahāra → il Cuore Puro/Morto/Malato
→ purificazione esterna → najāsah → ḥadath → il wuḍūʾ → le condizioni della
preghiera → i Pilastri → atti invalidanti*. Senza auto-riferimento quel trattato
si spappola in schede scollegate e il contenuto perde la sua logica.

I due tipi nuovi vengono dal Notion: **`tipo_umano`** (Credente · Miscredente ·
Ipocrita — categorie teologiche messe accanto a jinn e angeli, non persone) e
**`pilastro`** (Shahāda · Ṣalāt · Zakāt · Ṣawm · Ḥajj, che lì sono la radice di
tutto).

## `fonti` — autori e opere

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `tipo` | text | `raccolta`\|`opera`\|`autore`\|`sito` |
| `nome` | text | «Storie dei Profeti», «Ṣaḥīḥ al-Bukhārī» |
| `autore_id` | uuid FK → `fonti.id` | Ibn Kathīr |
| `nota` | text | |

Nel Notion hai pagine dedicate a **Ibn Kathīr**, **al-Albānī** e **Mālik** con le
loro opere. Con `fonte` come stringa libera quel legame si perde: non sapresti
più che la scheda su Mūsā viene da *Storie dei Profeti* e che quel libro è di
Ibn Kathīr. Con una tabella, da un sapiente vedi tutto ciò che ne discende.

## `ricorrenze` — il calendario islamico

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | Ramadan, ʿĀshūrāʾ, Notte del Destino, giorni bianchi |
| `arabo` | text | |
| `mese_hijri` | int | 1–12 |
| `giorno_hijri` | int | nullable (un mese intero non ha giorno) |
| `durata_giorni` | int | |
| `regola` | text | `fissa`\|`ultimi_dieci`\|`mensile` (giorni bianchi = 13-15 ogni mese) |
| `tipo` | text | `digiuno`\|`festa`\|`notte`\|`periodo` |
| `descrizione` | text | |

Assente dal modello e presente nel Notion (Ramadan, Shawwāl, Dhū al-Ḥijjah,
Notte del Destino, digiuno). Serve alla pagina Oggi: `widgets.js` oggi calcola i
giorni bianchi a mano dalla fase lunare (riga 93) e non sa nulla del resto.

**Perché una sola tabella:** `app.js` ha già un motore unico per quattro di
queste (`STUDIO_PAGES`, righe 530-598) e le altre quattro sono varianti dello
stesso schermo. Hai aggiunto azioni, segni_ora, creazione e luoghi come
sezioni identiche: la prossima sezione che ti verrà in mente sarà uguale.
Con tabelle separate ogni sezione nuova costa una tabella, un CRUD e una
policy. Con `voci` costa una riga in un enum.

**Cosa va in `dati` JSONB:**
- `storia` → `{ sura: 12, scene: [...] , insegnamenti: "..." }`
- `personaggio` → `{ epoca: "...", luogo: "...", parentele: [...] }`
- `luogo` → `{ lat: 21.42, lon: 39.82 }`

## `adhkar` — il testo dei dhikr

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | |
| `arabo` | text | |
| `traduzione` | text | |
| `translit` | text | |
| `fonte` | text | |
| `ripetizioni_std` | text | «33×3» — il valore tradizionale |

**Attenzione, qui c'è uno split che oggi non esiste.** Nel modello attuale
`adhkar` mescola due cose: *il testo del dhikr* (canonico — Āyat al-Kursī è
Āyat al-Kursī per chiunque) e *la tua routine* (personale — che tu lo reciti
dopo la ṣalāt, in quest'ordine, e oggi l'hai fatto). Separarle è ciò che
permette a due utenti di avere routine diverse sugli stessi testi.
La parte personale è `adhkar_utente`, nel Layer B.

---

# Layer B — Personale

Ogni tabella: `user_id uuid NOT NULL DEFAULT auth.uid()` FK → `auth.users`,
RLS attiva, policy `user_id = auth.uid()` su select/insert/update/delete.

## `profili`

`id` uuid PK FK → `auth.users` · `nome` · `creato_il`.
Estende l'utente di Supabase Auth con quel che serve all'app.

## `impostazioni` — una riga per utente

`user_id` PK · `dati` jsonb · `modificato_il`.

Il JSONB regge la struttura annidata che `store.js` già usa (`tempo`,
`preghiere`, `vista`) e che `deepMerge`/`fillDefaults` sanno aggiornare senza
perdere le scelte esistenti. Normalizzarla in colonne significherebbe una
migration ogni volta che aggiungi un interruttore.

Eccezione: i **luoghi** escono dal JSONB e diventano tabella, perché hanno un
id, si creano e si cancellano, e domani porteranno gli orari di preghiera.

## `luoghi`

`id` uuid PK · `user_id` · `nome` · `lat` · `lon` · `tz` · `attivo` bool.

## `orari_preghiera` — il foglio della moschea

| colonna | tipo | note |
|---|---|---|
| `user_id` · `luogo_id` · `data` | — | chiave primaria composta |
| `fajr` `shuruq` `zuhr` `asr` `maghrib` `isha` | time | |
| **`tz_origine`** | text | **il fuso in cui gli orari sono scritti sul foglio** |
| `fonte` | text | `calendario` \| `calcolo` \| `manuale` |
| `fonte_nome` | text | «Moschea di Casablanca», «UCOII» |
| `immagine_url` | text | la foto del calendario da cui sono trascritti |

Il calcolo astronomico resta il **ripiego**: quando per quel giorno e quel
luogo esiste una riga qui, vince questa. Un calendario di moschea non coincide
quasi mai al minuto con il calcolo, e quello che conta è l'orario con cui
prega la gente intorno a te.

**`tz_origine` è la colonna che risolve Marocco/Italia.** Un foglio di
Casablanca riporta ore Africa/Casablanca anche mentre lo leggi da Milano: se
si assumesse il fuso di chi guarda, gli orari slitterebbero di un'ora senza
che nulla lo segnali. Tenendo il fuso d'origine sulla riga, l'app sa sempre
cosa sta leggendo e può convertire.

Si lega a `attivita.ancora = 'preghiera'`: oggi «Maghrib +10» usa una costante
scritta a mano in `store.js`; da qui in avanti prenderà l'orario vero del
giorno, e le attività ancorate alle preghiere si spostano da sole quando ti
sposti tu.

## `khatam` — le letture integrali

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `numero` | int | khatam #1, #2, #3… |
| `aya_id` | int FK → `ayat.id` | il segnalibro: una colonna sola invece di sura+aya |
| `stato` | text | `attivo` \| `fermato` \| `completato` |
| `iniziato_il` | date | **nuovo** |
| `completato_il` | date | **nuovo** |

Indice UNIQUE parziale su (`user_id`) WHERE `stato = 'attivo'`: garantisce a
livello di database la regola che oggi è solo nel codice («uno solo alla
volta», store.js:312).

Con `iniziato_il` e `completato_il` diventa finalmente possibile la domanda
naturale: quanto ci hai messo, e stai andando più veloce di prima.

## `pensieri`

`id` uuid PK · `user_id` · `testo` · `giorno` date · `creato_il` timestamptz ·
**`stato`** (`grezzo`\|`lavorato`\|`migrato`) · `voce_id` uuid FK nullable.

Le ancore («nato da un versetto») **escono dalla tabella** e vivono in
`legami`. Un pensiero può nascere da più cose insieme: da un versetto *e* da
un tema, e oggi devi sceglierne una.

**`stato` viene dal Notion.** Pagine come *Bozze e appunti*, *RIFLESSIONI*,
*Appunti della settimana* sono cattura grezza in attesa di diventare scheda. È
esattamente ciò che l'app già promette — «da qui può maturare e migrare nello
Studio» (`renderPensieri`) — senza avere il campo per registrarlo. Quando un
pensiero matura in una voce di studio, `voce_id` punta a dove è finito.

## `legami` — la rete

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid **nullable** | NULL = legame canonico |
| `da_tipo` / `da_id` | text / text | |
| `a_tipo` / `a_id` | text / text | |
| `relazione` | text | `nato_da`, `conferma`, `parla_di`, `avviene_in` |

La colonna `user_id` nullable è il punto:

- **legame canonico** (`user_id IS NULL`): «l'hadith Muslim 596 conferma il
  dhikr Tasbīḥ», «la storia di Yūsuf avviene nella sura 12». Vero per tutti,
  fa parte dell'archivio.
- **legame personale** (`user_id` valorizzato): «questo mio pensiero è nato
  da 12:21». Solo tuo.

È la struttura che rende Addukira un archivio invece di un elenco: da
qualunque scheda puoi chiedere *cosa è collegato qui*, in entrambe le
direzioni. E fa vivere quel `anchor_tipo === 'asma'` che `openAsmaDetail()`
(app.js:640) cerca già senza che nulla lo produca.

Prezzo da pagare, dichiarato: Postgres non può imporre una foreign key su una
colonna polimorfica. L'integrità la garantisce un trigger di validazione, non
il motore.

## `attivita` — la tua routine (ex `adhkar_utente`)

Nasce da un'**azione** del magazzino e diventa comportamento quotidiano.

| colonna | tipo | note |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `azione_id` | uuid FK → `voci` (`tipo='azione'`) **nullable** | da dove viene: il «perché» |
| `adhkar_id` | uuid FK → `adhkar` **nullable** | il testo canonico, se ne ha uno |
| `nome` | text | |
| **`verso`** | text | `fare` \| `evitare` |
| `momento` | text | `risveglio`\|`dopo_salat`\|`lettura`\|`sera`\|`prima_dormire` |
| `ancora` | text | `libera` \| `ora_fissa` \| `preghiera` |
| `ora` | time | se `ora_fissa` |
| `preghiera` | text | se `preghiera`: `fajr`…`isha` |
| `offset_min` | int | ± minuti dalla preghiera |
| `ricorrenza` | jsonb | vedi sotto |
| `ricorrenza_id` | uuid FK → `ricorrenze` **nullable** | per agganciare quelle canoniche |
| `inizio` | date | |
| `fine` | date nullable | |
| `attiva` | bool | |
| `ripetizioni` | text | «33×3» |
| `ordine` | int | |

### `verso`: fare ed evitare

Il magazzino Azioni contiene sia opere da compiere (Ṣadaqa, Birr al-wālidayn)
sia peccati (Ghība). Il meccanismo è lo stesso, cambia il segno:

| | `fare` | `evitare` |
|---|---|---|
| bottone nella scheda | «Portala nella mia giornata» | «Mettila tra le cose da evitare» |
| `✓` in Oggi significa | l'ho fatta | non ci sono cascato |
| `✕` significa | saltata | ci sono cascato |
| **salto automatico a orario** | sì | **no** — un peccato da evitare vale tutto il giorno, non scade alle 08:00: si valuta a fine giornata |

### `ancora`: quando, davvero

Il campo `ora` da solo non basta. «Dopo Maghrib» non è un orario: è un evento
mobile che si sposta ogni giorno. Tre modi di ancorare un'attività:

- **`libera`** — nessun orario, resta da fare tutto il giorno (default)
- **`ora_fissa`** — `ora` = 07:30
- **`preghiera`** — `preghiera` = maghrib, `offset_min` = +10

### `ricorrenza`: il calendario è hijri, non gregoriano

Molte ricorrenze islamiche non stanno in un cron gregoriano:

| Caso | Forma |
|---|---|
| ogni giorno | `{"tipo":"quotidiana"}` |
| lunedì e giovedì | `{"tipo":"settimanale","giorni":[1,4]}` |
| **giorni bianchi 13-15** | `{"tipo":"mensile_hijri","giorni":[13,14,15]}` |
| Ramadan | `{"tipo":"annuale_hijri","mese":9}` |
| ʿĀshūrāʾ | `{"tipo":"annuale_hijri","mese":1,"giorno":10}` |
| 6 giorni di Shawwāl | `{"tipo":"annuale_hijri","mese":10,"conteggio":6}` |

`ricorrenza_id` permette in alternativa di agganciarsi a una riga già definita
in `ricorrenze`, invece di ripetere la regola. Le due tabelle guardano la
stessa cosa da due lati: `ricorrenze` è il calendario, `attivita.ricorrenza`
è la tua adesione a quel calendario.

## `spunte` — la costanza

`user_id` · `adhkar_utente_id` FK · `giorno` date · `fatto_il` timestamptz.
PK(`user_id`, `adhkar_utente_id`, `giorno`).

Sostituisce `spunte: { '2026-07-20': [1,2] }`. Il `giorno` si calcola nel fuso
dell'utente (correzione #2). Questa è la tabella da cui nascono le strisce di
costanza e i grafici mensili.

## `memorizzazione`

| colonna | tipo | note |
|---|---|---|
| `user_id` | uuid | |
| `aya_id` | int FK → `ayat.id` | |
| `stato` | text | `nuovo` \| `in_corso` \| `consolidato` |
| `ultima_ripetizione` | date | |
| `prossima_ripetizione` | date | |
| `forza` | int | 0–5 |

PK(`user_id`, `aya_id`).

Oggi è un array di coppie `{sura_id, aya}`: sai *cosa* hai memorizzato, non
*quanto sta tenendo*. Con queste colonne la memorizzazione diventa a
ripetizione spaziata — che è l'unico modo in cui la ḥifẓ funziona davvero.
Se preferisci restare al semplice on/off, restano NULL e non danno fastidio.

## `evidenziazioni`

`user_id` · `aya_id` · `colore` · `nota` · `creato_il`. PK(`user_id`, `aya_id`).

## `piano_studio`

`user_id` PK · `piano` (`annuale`\|`biennale`\|`personalizzato`) · `hizb` ·
`thumn` · `obiettivo_ayat_giorno`.

---

## Riepilogo

**Canonico (9):** `sure` · `ayat` · `ayat_traduzioni` · `asma` · `hadith` ·
`voci` · `adhkar` · `fonti` · `ricorrenze`

**Personale (11):** `profili` · `impostazioni` · `luoghi` · `khatam` ·
`pensieri` · `legami` · `attivita` · `spunte` · `memorizzazione` ·
`evidenziazioni` · `piano_studio`

Venti tabelle contro le 22 chiavi di localStorage, con dentro molto più di
quello che c'è oggi.

---

## Come ci arriva `store.js`

L'API pubblica dello store **non cambia**. `app.js` continua a chiamare
`store.list()`, `store.add()`, `store.toggle()` senza sapere nulla.
Cambiano solo `init()` (carica da Supabase) e `_persist()` (scrive lì),
esattamente come previsto nel commento in cima al file.

Due punti dove lo store dovrà lavorare un po' di più:

- `store.list('pensieri')` dovrà fare una join con `legami` per ricostruire
  `anchor_tipo`/`anchor_id` che `anchorLabel()` si aspetta. In alternativa si
  aggiorna `anchorLabel()` per leggere una lista di ancore.
- `store.list('azioni')`, `list('luoghi')` ecc. diventano
  `select * from voci where tipo = 'azione'`. Una riga di mappatura.

---

## Decisioni aperte

**1. Quando inizia il giorno.** Mezzanotte locale (semplice, familiare) o
**maghrib** (il giorno islamico)? Cambia come si calcola `spunte.giorno` e
cosa vedi in «Oggi» alle 19:00. Se vale il maghrib, serve l'orario del
tramonto in tabella e la giornata diventa un intervallo, non una data.
*Proposta: mezzanotte locale ora, con la colonna pronta per cambiare idea.*

**2. ~~Orari di preghiera: calcolati o in tabella.~~ RISOLTO il 2026-07-25.**
Entrambi, con precedenza al **calendario**: tabella `orari_preghiera`, e il
calcolo astronomico solo dove manca la riga. Con `tz_origine` per non
sbagliare quando il foglio è marocchino e tu sei in Italia.
Resta da fare il **front**: la schermata per trascrivere il calendario (o
fotografarlo) e la sostituzione della costante `PREG_MIN` in `store.js`.

**3. ~~Da dove prendiamo il testo del Corano.~~ RISOLTO il 2026-07-25.**
Riwāya **Ḥafṣ**. Testo Uthmani + `page_number` da Tanzil/Quranpedia, tajwīd da
`cpfair/quran-tajweed`. Resta da scegliere **la traduzione italiana**, che è
la parte con la licenza più delicata: il testo arabo è di pubblico dominio,
una traduzione moderna no.

**4. Chi cura il canonico.** Se il Layer A è modificabile solo da te, serve un
ruolo admin: colonna `ruolo` in `profili`, oppure un semplice claim JWT.
Senza, il canonico è read-only per tutti e si popola solo via SQL.
