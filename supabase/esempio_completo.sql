-- ============================================================
--  ADDUKIRA — UNA RIGA DI ESEMPIO PER OGNI TABELLA
--  scritto il 2026-08-01
--
--  A COSA SERVE
--  Questo file è il MODELLO DI SCRITTURA del database. Ogni riga qui
--  dentro è compilata in tutti i suoi campi, nel modo corretto, e le
--  righe sono collegate fra loro come lo sarebbero davvero.
--  Chi (o cosa) deve inserire dati in Addukira legge prima queste righe,
--  capisce la logica, e poi la segue.
--
--  Tutti i titoli cominciano con «PROVA » così si riconoscono a colpo
--  d'occhio e si cancellano con una riga sola (in fondo al file).
--
--  COSA NON È QUI, E PERCHÉ
--  · sure, ayat, ayat_traduzioni  → il Corano, canonico e già completo
--    (114 sure, 6236 ayat). Inserire versetti finti lo corromperebbe.
--  · asma                          → i 99 Nomi, canonici e già completi.
--  · profili, impostazioni         → una riga per utente, esiste già:
--    la chiave primaria è l'utente stesso, non se ne può aggiungere.
--
--  LE DUE REGOLE DA CAPIRE PRIMA DI SCRIVERE
--  1. LAYER. Le tabelle canoniche (sure, ayat, asma, fonti, hadith, voci,
--     adhkar, ricorrenze) sono patrimonio condiviso: NON hanno user_id.
--     Le tabelle personali (pensieri, attivita, spunte, khatam, …) hanno
--     user_id e sono protette da RLS: ognuno vede solo le proprie.
--  2. LEGAMI. Non esistono colonne «tema_id» o «hadith_id» sparse per le
--     tabelle: tutto ciò che collega due cose sta in `legami`, che è
--     polimorfica (da_tipo/da_id → a_tipo/a_id). È da lì che nascono le
--     pagine-raccolta (Temi, Fiqh, Luoghi…), che si riempiono da sole.
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
--  FONTI — autori e opere da cui si cita.
--  `tipo` = raccolta | opera | autore | sito.
--  Un'opera punta al suo autore con autore_id: sono due righe, non una.
-- ────────────────────────────────────────────────────────────
insert into public.fonti (id, tipo, nome, autore_id, nota) values
  ('0e5e0001-0000-4000-8000-000000000001', 'autore', 'PROVA Ibn Kathīr', null,
   'Storico ed esegeta, m. 774 H. Esempio di fonte-persona.'),
  ('0e5e0001-0000-4000-8000-000000000002', 'opera',  'PROVA Storie dei Profeti',
   '0e5e0001-0000-4000-8000-000000000001',
   'Esempio di fonte-opera: punta al suo autore con autore_id.');

-- ────────────────────────────────────────────────────────────
--  VOCI — tutte le schede di studio stanno qui, distinte da `tipo`.
--  titolo   = il nome (obbligatorio)
--  arabo    = il nome/testo in arabo
--  sommario = UNA riga, è quella che si legge sulle card
--  corpo    = il testo lungo
--  categoria= vale solo per alcuni tipi (personaggio, azione, luogo…)
--  parent_id= per i trattati a più livelli (vedi il wuḍūʾ dentro ṭahāra)
--  dati     = jsonb per gli extra specifici del tipo, MAI null: '{}'
--  ordine   = ordinamento fra fratelli
-- ────────────────────────────────────────────────────────────
insert into public.voci (id, tipo, categoria, parent_id, titolo, arabo, sommario, corpo, fonte_id, riferimento, dati, slug, ordine) values
  -- PERSONAGGIO — categoria: muhammad|profeta|sahaba|madre_credenti|nemico|angelo|jinn|sapiente|altro
  ('0e5e0002-0000-4000-8000-000000000001', 'personaggio', 'sahaba', null,
   'PROVA Anas ibn Mālik', 'أنس بن مالك',
   'Il servitore del Profeta ﷺ per dieci anni.',
   'Servì il Profeta ﷺ dall''età di dieci anni fino alla sua morte. Riportò più di duemila hadith. Esempio di scheda-personaggio completa.',
   '0e5e0001-0000-4000-8000-000000000002', 'cap. 12', '{"anni":"m. 93 H"}'::jsonb, 'prova-anas-ibn-malik', 1),

  -- TEMA — è una scheda-raccolta: titolo + corpo, niente altro.
  -- Si scrive una volta; tutto ciò che lo riguarda gli si aggancia
  -- nel tempo con `legami`, e compare da solo nella sua pagina.
  ('0e5e0002-0000-4000-8000-000000000002', 'tema', null, null,
   'PROVA ṣabr', 'صبر', null,
   'La pazienza: tenere fermo il cuore su ciò che è giusto quando costa. Esempio di scheda-raccolta.',
   null, null, '{}'::jsonb, 'prova-sabr', 1),

  -- FIQH — anche questa una scheda-raccolta. Qui il parent_id: ṭahāra
  -- è l''argomento padre, il wuḍūʾ ne è un capitolo.
  ('0e5e0002-0000-4000-8000-000000000003', 'fiqh', null, null,
   'PROVA ṭahāra', 'طهارة', null,
   'La purificazione: condizione della ṣalāt. Esempio di argomento padre.',
   null, null, '{}'::jsonb, 'prova-tahara', 1),
  ('0e5e0002-0000-4000-8000-000000000004', 'fiqh', null, '0e5e0002-0000-4000-8000-000000000003',
   'PROVA il wuḍūʾ', 'وضوء', null,
   'Esempio di scheda FIGLIA: parent_id punta a ṭahāra.',
   null, null, '{}'::jsonb, 'prova-wudu', 2),

  -- STORIA — titolo, racconto (corpo), fonte. I personaggi e le sure
  -- non stanno in colonne: si collegano con `legami`.
  ('0e5e0002-0000-4000-8000-000000000005', 'storia', null, null,
   'PROVA la pazienza di Ayyūb', 'صبر أيوب',
   'La prova lunga e la lode che non si interrompe.',
   'Ayyūb عليه السلام perse beni, figli e salute, e non smise di lodare. Esempio di scheda-storia completa.',
   '0e5e0001-0000-4000-8000-000000000002', 'pp. 210-218', '{}'::jsonb, 'prova-pazienza-ayyub', 1),

  -- AZIONE — il magazzino della routine: da qui nascono le attività.
  -- categoria: buona | culto | peccato  (peccato → «da evitare»)
  ('0e5e0002-0000-4000-8000-000000000006', 'azione', 'culto', null,
   'PROVA dire il tasbīḥ dopo la ṣalāt', null,
   'Trentatré volte dopo ogni preghiera obbligatoria.',
   'Si dice subito dopo il salām, prima di alzarsi. Esempio di azione che diventa attività quotidiana.',
   null, null, '{}'::jsonb, 'prova-tasbih-dopo-salat', 1),

  -- SEGNO DELL''ORA — scheda-raccolta. categoria: minore | maggiore
  ('0e5e0002-0000-4000-8000-000000000007', 'segno_ora', 'maggiore', null,
   'PROVA il fumo', 'الدخان', null,
   'Uno dei segni maggiori. Esempio di scheda-raccolta.',
   null, null, '{}'::jsonb, 'prova-il-fumo', 1),

  -- CREAZIONE — scheda-raccolta
  ('0e5e0002-0000-4000-8000-000000000008', 'creazione', null, null,
   'PROVA gli angeli', 'الملائكة', null,
   'Creati di luce, non disobbediscono a ciò che è ordinato loro. Esempio di scheda-raccolta.',
   null, null, '{}'::jsonb, 'prova-gli-angeli', 1),

  -- LUOGO — scheda-raccolta. categoria: sacro | aldila
  ('0e5e0002-0000-4000-8000-000000000009', 'luogo', 'sacro', null,
   'PROVA la Kaʿba', 'الكعبة', null,
   'La prima Casa posta per gli uomini. Esempio di scheda-raccolta.',
   null, null, '{}'::jsonb, 'prova-la-kaba', 1),

  -- I due tipi previsti nel modello ma non ancora nell''interfaccia:
  -- esistono per quando serviranno, e il vincolo li accetta già.
  ('0e5e0002-0000-4000-8000-000000000010', 'tipo_umano', null, null,
   'PROVA il credente', 'المؤمن', null,
   'Categoria teologica, non una persona. Tipo previsto, pagina non ancora fatta.',
   null, null, '{}'::jsonb, 'prova-il-credente', 1),
  ('0e5e0002-0000-4000-8000-000000000011', 'pilastro', null, null,
   'PROVA la ṣalāt', 'الصلاة', null,
   'Secondo pilastro. Tipo previsto, pagina non ancora fatta.',
   null, null, '{}'::jsonb, 'prova-la-salat', 2);

-- ────────────────────────────────────────────────────────────
--  HADITH — testo obbligatorio, tutto il resto facoltativo.
--  `raccolta` e `numero_rif` sono TESTO COMPOSTO quando le fonti sono
--  più d'una, nella forma che scrive l'app:
--      raccolta   = 'Bukhārī e Muslim'
--      numero_rif = 'Bukhārī 5812 · Muslim 2079'
--  `fonte_id` punta alla PRIMA raccolta: è il legame vero verso `fonti`.
--  `narratore_id` punta alla voce del personaggio che lo riporta.
--  grado: sahih | hasan | daif | qudsi | non_verificato
-- ────────────────────────────────────────────────────────────
insert into public.hadith (id, titolo, testo_ar, testo, raccolta, numero_rif, grado, isnad, narratore_id, fonte_id, nota) values
  ('0e5e0003-0000-4000-8000-000000000001',
   'PROVA la pazienza al primo colpo',
   'إنما الصبر عند الصدمة الأولى',
   'La pazienza è al primo colpo.',
   'Bukhārī e Muslim',
   'Bukhārī 1283 · Muslim 926',
   'sahih',
   'Da Anas ibn Mālik رضي الله عنه',
   '0e5e0002-0000-4000-8000-000000000001',
   (select id from public.fonti where nome = 'Bukhārī' limit 1),
   'Esempio di hadith completo: due fonti composte, narratore collegato, nota esplicativa.');

-- ────────────────────────────────────────────────────────────
--  ADHKAR — il TESTO canonico di un dhikr. Non è un'abitudine:
--  l'abitudine è l'attività che lo richiama (vedi `attivita`).
--  Il momento e l'orario NON stanno qui: stanno sull'attività.
-- ────────────────────────────────────────────────────────────
insert into public.adhkar (id, nome, arabo, traduzione, translit, fonte_id, ripetizioni_std) values
  ('0e5e0004-0000-4000-8000-000000000001',
   'PROVA Tasbīḥ dopo la ṣalāt',
   'سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ',
   'Gloria ad Allah · Lode ad Allah · Allah è il più grande',
   'subḥāna llāh · al-ḥamdu lillāh · allāhu akbar',
   (select id from public.fonti where nome = 'Muslim' limit 1),
   '33×3');

-- ────────────────────────────────────────────────────────────
--  RICORRENZE — le date che tornano nel calendario HIJRI, non gregoriano.
--  regola : fissa | ultimi_dieci | mensile   ← il database ammette SOLO questi
--  tipo   : digiuno | festa | notte | periodo
--  durata_giorni: quanti giorni dura. mese_hijri null = vale in ogni mese.
-- ────────────────────────────────────────────────────────────
insert into public.ricorrenze (id, nome, arabo, mese_hijri, giorno_hijri, durata_giorni, regola, tipo, descrizione) values
  -- torna OGNI mese: regola 'mensile', mese_hijri resta null
  ('0e5e0005-0000-4000-8000-000000000001',
   'PROVA giorni bianchi', 'الأيام البيض', null, 13, 3, 'mensile', 'digiuno',
   'Il 13, 14 e 15 di ogni mese hijri. regola=mensile e mese_hijri null: vale in ogni mese.'),
  -- torna una volta l'anno, a data ferma: regola 'fissa', mese e giorno pieni
  ('0e5e0005-0000-4000-8000-000000000002',
   'PROVA ʿĀshūrāʾ', 'عاشوراء', 1, 10, 1, 'fissa', 'digiuno',
   'Il 10 di Muḥarram. regola=fissa: mese e giorno fermi nel calendario hijri.');

-- ────────────────────────────────────────────────────────────
--  ATTIVITÀ — l'abitudine vera, nella giornata dell'utente.
--  Nasce da un'AZIONE (azione_id) oppure da un DHIKR (adhkar_id).
--  verso   : fare | evitare
--  momento : risveglio | mattino | pomeriggio | fine_giornata | sera | notte | tutto_giorno
--  ancora  : libera | ora_fissa (serve `ora`) | preghiera (serve `preghiera` + offset_min)
--  ricorrenza: jsonb — {"tipo":"quotidiana"} · {"tipo":"settimanale","giorni":[1,4]}
--              {"tipo":"mensile_hijri","giorni":[13,14,15]} · {"tipo":"annuale_hijri","mese":9}
-- ────────────────────────────────────────────────────────────
insert into public.attivita (id, user_id, azione_id, adhkar_id, nome, verso, momento, ancora, ora, preghiera, offset_min, ricorrenza, ricorrenza_id, inizio, fine, attiva, ripetizioni, ordine) values
  -- da un'AZIONE, agganciata a una preghiera: «5 minuti dopo il Maghrib»
  ('0e5e0006-0000-4000-8000-000000000001', '477ce587-0824-4513-836c-3bb6233ac660',
   '0e5e0002-0000-4000-8000-000000000006', null,
   'PROVA tasbīḥ dopo il Maghrib', 'fare', 'sera', 'preghiera', null, 'maghrib', 5,
   '{"tipo":"quotidiana"}'::jsonb, null, current_date, null, true, '33×3', 1),
  -- da un DHIKR, a orario fisso, e di quelle che restano tutto il giorno
  ('0e5e0006-0000-4000-8000-000000000002', '477ce587-0824-4513-836c-3bb6233ac660',
   null, '0e5e0004-0000-4000-8000-000000000001',
   'PROVA leggere una pagina', 'fare', 'tutto_giorno', 'ora_fissa', '09:30', null, 0,
   '{"tipo":"settimanale","giorni":[1,4]}'::jsonb, null, current_date, null, true, '1 pagina', 2),
  -- una da EVITARE: nasce da un''azione di categoria «peccato»
  ('0e5e0006-0000-4000-8000-000000000003', '477ce587-0824-4513-836c-3bb6233ac660',
   null, null,
   'PROVA non alzare la voce', 'evitare', 'tutto_giorno', 'libera', null, null, 0,
   '{"tipo":"mensile_hijri","giorni":[13,14,15]}'::jsonb, '0e5e0005-0000-4000-8000-000000000001', current_date, null, true, null, 3);

-- ────────────────────────────────────────────────────────────
--  SPUNTE — una riga per attività PER GIORNO. È il registro della
--  costanza. stato: fatto | saltato. Se la riga non c'è, non è ancora
--  stato deciso niente per quel giorno.
-- ────────────────────────────────────────────────────────────
insert into public.spunte (user_id, attivita_id, giorno, stato) values
  ('477ce587-0824-4513-836c-3bb6233ac660', '0e5e0006-0000-4000-8000-000000000001', current_date, 'fatto'),
  ('477ce587-0824-4513-836c-3bb6233ac660', '0e5e0006-0000-4000-8000-000000000002', current_date, 'saltato');

-- ────────────────────────────────────────────────────────────
--  PENSIERI — il diario. stato: grezzo → lavorato → migrato
--  (migrato = è diventato una scheda di studio; allora voce_id la indica).
--  I collegamenti del pensiero NON stanno qui: stanno in `legami`.
-- ────────────────────────────────────────────────────────────
insert into public.pensieri (id, user_id, testo, giorno, stato, voce_id) values
  ('0e5e0007-0000-4000-8000-000000000001', '477ce587-0824-4513-836c-3bb6233ac660',
   'PROVA — la pazienza non è resistere a lungo, è non lamentarsi nel primo istante. Esempio di pensiero maturato in una scheda.',
   current_date, 'lavorato', '0e5e0002-0000-4000-8000-000000000002');

-- ────────────────────────────────────────────────────────────
--  LEGAMI — la rete. È QUI che si collega tutto con tutto.
--  user_id NULL  = legame canonico, vero per chiunque
--  user_id pieno = legame personale, solo tuo
--
--  IL VERSO CONTA. Lo stesso collegamento va scritto sempre nello stesso
--  senso, se no finisce in tabella due volte. L'ordine di precedenza è:
--    pensiero → azione → hadith → personaggio → storia → tema → fiqh
--             → versetto → sura → asma
--  chi viene prima sta a sinistra della freccia.
--
--  relazione: nato_da (dai pensieri) · fondata_su (azione → hadith)
--             collegato (tutto il resto) · tag · cadenza
--
--  TAG e CADENZE viaggiano qui dentro: a_tipo='tag' (o 'cadenza') e
--  a_id È IL TESTO STESSO dell'etichetta. Nessuna tabella dei tag.
-- ────────────────────────────────────────────────────────────
insert into public.legami (id, user_id, da_tipo, da_id, a_tipo, a_id, relazione) values
  -- canonico: vale per tutti, non è di nessuno
  ('0e5e0008-0000-4000-8000-000000000001', null,
   'storia', '0e5e0002-0000-4000-8000-000000000005', 'sura', '21', 'collegato'),
  -- l'azione nasce DAL suo hadith: è il «perché» dell'abitudine
  ('0e5e0008-0000-4000-8000-000000000002', '477ce587-0824-4513-836c-3bb6233ac660',
   'azione', '0e5e0002-0000-4000-8000-000000000006', 'hadith', '0e5e0003-0000-4000-8000-000000000001', 'fondata_su'),
  -- l'hadith cita il personaggio che lo riporta
  ('0e5e0008-0000-4000-8000-000000000003', '477ce587-0824-4513-836c-3bb6233ac660',
   'hadith', '0e5e0003-0000-4000-8000-000000000001', 'personaggio', '0e5e0002-0000-4000-8000-000000000001', 'collegato'),
  -- e parla di un tema: è così che la pagina del tema si riempie
  ('0e5e0008-0000-4000-8000-000000000004', '477ce587-0824-4513-836c-3bb6233ac660',
   'hadith', '0e5e0003-0000-4000-8000-000000000001', 'tema', '0e5e0002-0000-4000-8000-000000000002', 'collegato'),
  -- il pensiero è nato da un versetto: a_id di un versetto è il suo id
  -- globale 1-6236 (2:155 = 162), non «2:155»
  ('0e5e0008-0000-4000-8000-000000000005', '477ce587-0824-4513-836c-3bb6233ac660',
   'pensiero', '0e5e0007-0000-4000-8000-000000000001', 'versetto', '162', 'nato_da'),
  -- e riguarda lo stesso tema
  ('0e5e0008-0000-4000-8000-000000000006', '477ce587-0824-4513-836c-3bb6233ac660',
   'pensiero', '0e5e0007-0000-4000-8000-000000000001', 'tema', '0e5e0002-0000-4000-8000-000000000002', 'collegato'),
  -- la storia parla del tema e del personaggio
  ('0e5e0008-0000-4000-8000-000000000007', '477ce587-0824-4513-836c-3bb6233ac660',
   'storia', '0e5e0002-0000-4000-8000-000000000005', 'tema', '0e5e0002-0000-4000-8000-000000000002', 'collegato'),
  -- TAG: a_id è il testo del tag
  ('0e5e0008-0000-4000-8000-000000000008', '477ce587-0824-4513-836c-3bb6233ac660',
   'hadith', '0e5e0003-0000-4000-8000-000000000001', 'tag', 'PROVA pazienza', 'tag'),
  ('0e5e0008-0000-4000-8000-000000000009', '477ce587-0824-4513-836c-3bb6233ac660',
   'azione', '0e5e0002-0000-4000-8000-000000000006', 'tag', 'PROVA lingua', 'tag'),
  -- CADENZA: stessa meccanica, elenco separato. Solo sulle azioni.
  ('0e5e0008-0000-4000-8000-000000000010', '477ce587-0824-4513-836c-3bb6233ac660',
   'azione', '0e5e0002-0000-4000-8000-000000000006', 'cadenza', 'PROVA dopo ogni ṣalāt', 'cadenza'),
  -- il fiqh raccoglie anche lui: l''hadith parla di ṭahāra
  ('0e5e0008-0000-4000-8000-000000000011', '477ce587-0824-4513-836c-3bb6233ac660',
   'hadith', '0e5e0003-0000-4000-8000-000000000001', 'fiqh', '0e5e0002-0000-4000-8000-000000000003', 'collegato'),
  -- e un luogo, un segno, una voce della creazione: le raccolte funzionano tutte uguale
  ('0e5e0008-0000-4000-8000-000000000012', '477ce587-0824-4513-836c-3bb6233ac660',
   'hadith', '0e5e0003-0000-4000-8000-000000000001', 'luogo', '0e5e0002-0000-4000-8000-000000000009', 'collegato'),
  ('0e5e0008-0000-4000-8000-000000000013', '477ce587-0824-4513-836c-3bb6233ac660',
   'personaggio', '0e5e0002-0000-4000-8000-000000000001', 'asma', '1', 'si_riferisce_a');

-- ────────────────────────────────────────────────────────────
--  KHATAM — le letture integrali. `aya_id` è il segnalibro: l'indice
--  globale 1-6236, non sura:aya. Un solo khatam 'attivo' per utente:
--  lo impone un indice unico, quindi questo esempio è 'completato'.
-- ────────────────────────────────────────────────────────────
insert into public.khatam (id, user_id, numero, aya_id, stato, iniziato_il, scadenza, completato_il) values
  ('0e5e0009-0000-4000-8000-000000000001', '477ce587-0824-4513-836c-3bb6233ac660',
   99, 6236, 'completato', current_date - 60, current_date - 5, current_date - 3);

-- ────────────────────────────────────────────────────────────
--  PIANI_MEM — il piano di memorizzazione.
--  obiettivo_tipo: corano | juz | hizb | sura | versetti  ← solo questi
--  obiettivo_n   : jsonb — un numero (5) oppure una lista di sure ([18,36])
--  obiettivo     : quanti versetti in tutto; base: quanti ne sapevi già
-- ────────────────────────────────────────────────────────────
insert into public.piani_mem (id, user_id, inizio, fine, obiettivo_tipo, obiettivo_n, obiettivo, base, stato, completato_il) values
  ('0e5e000a-0000-4000-8000-000000000001', '477ce587-0824-4513-836c-3bb6233ac660',
   current_date - 90, current_date - 10, 'sura', '[112,113,114]'::jsonb, 15, 0, 'completato', current_date - 10);

-- ────────────────────────────────────────────────────────────
--  MEMORIZZAZIONE — un versetto memorizzato. Chiave: utente + aya.
--  stato: nuovo | in_corso | consolidato   ← solo questi
--  forza 0-5 e prossima_ripetizione sono per il ripasso spaziato.
-- ────────────────────────────────────────────────────────────
insert into public.memorizzazione (user_id, aya_id, stato, data, ultima_ripetizione, prossima_ripetizione, forza) values
  ('477ce587-0824-4513-836c-3bb6233ac660', 6236, 'consolidato', current_date - 30, current_date - 2, current_date + 5, 4);

-- ────────────────────────────────────────────────────────────
--  EVIDENZIAZIONI — un versetto evidenziato, con la sua nota.
-- ────────────────────────────────────────────────────────────
insert into public.evidenziazioni (user_id, aya_id, colore, nota) values
  ('477ce587-0824-4513-836c-3bb6233ac660', 162, 'giallo',
   'PROVA — il versetto della pazienza. Esempio di evidenziazione con nota.');

-- ────────────────────────────────────────────────────────────
--  LUOGHI — i posti per cui calcoli gli orari. `attivo` dice qual è
--  quello in uso; questo esempio resta spento per non cambiare i tuoi.
-- ────────────────────────────────────────────────────────────
insert into public.luoghi (id, user_id, nome, lat, lon, tz, attivo) values
  ('0e5e000b-0000-4000-8000-000000000001', '477ce587-0824-4513-836c-3bb6233ac660',
   'PROVA Medina', 24.4686, 39.6142, 'Asia/Riyadh', false);

-- ────────────────────────────────────────────────────────────
--  ORARI_PREGHIERA — il foglio della moschea, un giorno per riga.
--  `tz_origine` è il fuso in cui gli orari sono STAMPATI: serve a
--  riportarli nel fuso in cui vivi. fonte: calendario | calcolo | manuale
-- ────────────────────────────────────────────────────────────
insert into public.orari_preghiera (user_id, luogo_id, data, fajr, shuruq, zuhr, asr, maghrib, isha, tz_origine, fonte, fonte_nome, immagine_url, nota) values
  ('477ce587-0824-4513-836c-3bb6233ac660', '0e5e000b-0000-4000-8000-000000000001',
   date '2026-12-31', '05:34', '06:58', '12:16', '15:22', '17:34', '19:04',
   'Asia/Riyadh', 'calendario', 'PROVA calendario della moschea', null,
   'Esempio di riga di orari: una data, un luogo, i sei orari come sul foglio.');

commit;

-- ============================================================
--  PER CANCELLARE TUTTO L'ESEMPIO
--  (l'ordine conta: prima ciò che punta, poi ciò che è puntato)
-- ============================================================
-- begin;
-- delete from public.orari_preghiera where fonte_nome like 'PROVA %';
-- delete from public.luoghi        where nome like 'PROVA %';
-- delete from public.evidenziazioni where nota like 'PROVA %';
-- delete from public.memorizzazione where aya_id = 6236;
-- delete from public.piani_mem     where id = '0e5e000a-0000-4000-8000-000000000001';
-- delete from public.khatam        where numero = 99;
-- delete from public.legami        where id::text like '0e5e0008%';
-- delete from public.pensieri      where testo like 'PROVA %';
-- delete from public.spunte        where attivita_id::text like '0e5e0006%';
-- delete from public.attivita      where nome like 'PROVA %';
-- delete from public.ricorrenze    where nome like 'PROVA %';
-- delete from public.adhkar        where nome like 'PROVA %';
-- delete from public.hadith        where titolo like 'PROVA %';
-- delete from public.voci          where titolo like 'PROVA %';
-- delete from public.fonti         where nome like 'PROVA %';
-- commit;
