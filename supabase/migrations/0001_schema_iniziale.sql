-- ============================================================
-- Addukira · schema iniziale
-- Due layer: A = canonico (condiviso), B = personale (RLS)
-- Riferimento ragionato: SCHEMA.md
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- helper
-- ------------------------------------------------------------

create or replace function public.tocca_modificato()
returns trigger language plpgsql as $$
begin new.modificato_il := now(); return new; end;
$$;

-- ============================================================
-- LAYER A · CANONICO
-- ============================================================

-- 114 sure, chiave naturale
create table public.sure (
  numero            smallint primary key check (numero between 1 and 114),
  nome_arabo        text not null,
  translit          text not null,
  titolo_it         text,
  n_versetti        smallint not null check (n_versetti > 0),
  rivelazione       text check (rivelazione in ('meccana','medinese')),
  ordine_rivelazione smallint,
  pagina_inizio     smallint
);

-- 6236 ayat · riwaya Hafs · id = indice globale 1..6236
create table public.ayat (
  id                integer primary key check (id between 1 and 6236),
  sura              smallint not null references public.sure(numero) on delete restrict,
  numero            smallint not null check (numero > 0),
  testo_ar          text not null,
  testo_ar_ricerca  text,
  pagina            smallint check (pagina between 1 and 604),
  juz               smallint check (juz between 1 and 30),
  hizb              smallint check (hizb between 1 and 60),
  thumn             smallint check (thumn between 1 and 8),
  sajda             boolean not null default false,
  tajweed           jsonb,           -- [{rule,start,end}] · cpfair/quran-tajweed
  unique (sura, numero)
);
create index ayat_sura_idx    on public.ayat (sura, numero);
create index ayat_pagina_idx  on public.ayat (pagina);
create index ayat_juz_idx     on public.ayat (juz);
create index ayat_sajda_idx   on public.ayat (sajda) where sajda;
create index ayat_ricerca_idx on public.ayat using gin (to_tsvector('simple', coalesce(testo_ar_ricerca,'')));

-- traduzioni · ATTENZIONE: non a lettura pubblica, vedi RLS in fondo
create table public.ayat_traduzioni (
  aya_id       integer not null references public.ayat(id) on delete cascade,
  lang         text    not null default 'it',
  traduttore   text    not null,
  testo        text    not null,
  primary key (aya_id, lang, traduttore)
);
create index ayat_trad_ricerca_idx on public.ayat_traduzioni
  using gin (to_tsvector('italian', testo)) where lang = 'it';

-- 99 Nomi
create table public.asma (
  numero       smallint primary key check (numero between 1 and 99),
  arabo        text not null,
  translit     text not null,
  significato  text not null,
  spiegazione  text,
  aya_id       integer references public.ayat(id) on delete set null
);

-- fonti: autori e opere (Ibn Kathir -> Storie dei Profeti)
create table public.fonti (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null default 'opera' check (tipo in ('raccolta','opera','autore','sito')),
  nome       text not null,
  autore_id  uuid references public.fonti(id) on delete set null,
  nota       text,
  creato_il  timestamptz not null default now()
);
create index fonti_autore_idx on public.fonti (autore_id);

create table public.hadith (
  id           uuid primary key default gen_random_uuid(),
  titolo       text,
  testo_ar     text,
  testo        text not null,                    -- italiano
  raccolta     text,
  numero_rif   text,
  grado        text not null default 'non_verificato'
               check (grado in ('sahih','hasan','daif','qudsi','non_verificato')),
  isnad        text,
  narratore_id uuid,                             -- FK aggiunta dopo voci
  fonte_id     uuid references public.fonti(id) on delete set null,
  nota         text,
  creato_il    timestamptz not null default now(),
  modificato_il timestamptz not null default now()
);
create index hadith_raccolta_idx on public.hadith (raccolta);
create index hadith_grado_idx    on public.hadith (grado);
create index hadith_ricerca_idx  on public.hadith
  using gin (to_tsvector('italian', coalesce(titolo,'') || ' ' || testo || ' ' || coalesce(nota,'')));

-- schede di studio, gerarchiche (il FIQH e' un trattato a piu' livelli)
create table public.voci (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in
              ('personaggio','storia','tema','fiqh','azione','segno_ora',
               'creazione','luogo','tipo_umano','pilastro')),
  categoria   text,
  parent_id   uuid references public.voci(id) on delete cascade,
  titolo      text not null,
  arabo       text,
  sommario    text,
  corpo       text,
  fonte_id    uuid references public.fonti(id) on delete set null,
  riferimento text,
  dati        jsonb not null default '{}'::jsonb,
  slug        text unique,
  ordine      integer not null default 0,
  creato_il   timestamptz not null default now(),
  modificato_il timestamptz not null default now()
);
create index voci_tipo_idx    on public.voci (tipo, categoria);
create index voci_parent_idx  on public.voci (parent_id);
create index voci_ricerca_idx on public.voci
  using gin (to_tsvector('italian', titolo || ' ' || coalesce(sommario,'') || ' ' || coalesce(corpo,'')));

alter table public.hadith
  add constraint hadith_narratore_fk foreign key (narratore_id)
  references public.voci(id) on delete set null;

-- testo canonico dei dhikr (la routine personale sta in `attivita`)
create table public.adhkar (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  arabo           text,
  traduzione      text,
  translit        text,
  fonte_id        uuid references public.fonti(id) on delete set null,
  ripetizioni_std text,
  creato_il       timestamptz not null default now()
);

-- calendario islamico: Ramadan, giorni bianchi, Ashura...
create table public.ricorrenze (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  arabo         text,
  mese_hijri    smallint check (mese_hijri between 1 and 12),
  giorno_hijri  smallint check (giorno_hijri between 1 and 30),
  durata_giorni smallint not null default 1,
  regola        text not null default 'fissa' check (regola in ('fissa','ultimi_dieci','mensile')),
  tipo          text check (tipo in ('digiuno','festa','notte','periodo')),
  descrizione   text
);

-- ============================================================
-- LAYER B · PERSONALE
-- ============================================================

create table public.profili (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text,
  ruolo     text not null default 'utente' check (ruolo in ('utente','admin')),
  creato_il timestamptz not null default now()
);

-- chi cura il contenuto canonico (definita qui: ha bisogno di `profili`)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'admin');
$$;

create table public.impostazioni (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dati          jsonb not null default '{}'::jsonb,
  modificato_il timestamptz not null default now()
);

create table public.luoghi (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome    text not null,
  lat     double precision,
  lon     double precision,
  tz      text not null default 'Africa/Casablanca',
  attivo  boolean not null default false
);
create index luoghi_user_idx on public.luoghi (user_id);

-- letture integrali, con il periodo che ci si e' dati
create table public.khatam (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero        integer not null,
  aya_id        integer references public.ayat(id) on delete set null,
  stato         text not null default 'attivo' check (stato in ('attivo','sospeso','completato')),
  iniziato_il   date not null default current_date,
  scadenza      date,
  completato_il date,
  creato_il     timestamptz not null default now()
);
create index khatam_user_idx on public.khatam (user_id, stato);
-- un solo khatam attivo per utente: garantito dal database, non dal codice
create unique index khatam_uno_attivo on public.khatam (user_id) where stato = 'attivo';

create table public.pensieri (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  testo     text not null,
  giorno    date not null default current_date,
  stato     text not null default 'grezzo' check (stato in ('grezzo','lavorato','migrato')),
  voce_id   uuid references public.voci(id) on delete set null,
  creato_il timestamptz not null default now()
);
create index pensieri_user_idx    on public.pensieri (user_id, giorno desc);
create index pensieri_ricerca_idx on public.pensieri using gin (to_tsvector('italian', testo));

-- la rete: collega qualunque cosa a qualunque altra.
-- user_id NULL = legame canonico (vale per tutti)
create table public.legami (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade,
  da_tipo   text not null,
  da_id     text not null,
  a_tipo    text not null,
  a_id      text not null,
  relazione text not null default 'collegato',
  creato_il timestamptz not null default now(),
  unique (da_tipo, da_id, a_tipo, a_id, relazione)
);
create index legami_da_idx   on public.legami (da_tipo, da_id);
create index legami_a_idx    on public.legami (a_tipo, a_id);
create index legami_user_idx on public.legami (user_id);

-- la routine: nasce da un'azione del magazzino
create table public.attivita (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  azione_id     uuid references public.voci(id) on delete set null,
  adhkar_id     uuid references public.adhkar(id) on delete set null,
  nome          text not null,
  verso         text not null default 'fare' check (verso in ('fare','evitare')),
  momento       text not null default 'risveglio'
                check (momento in ('risveglio','dopo_salat','lettura','sera','prima_dormire')),
  ancora        text not null default 'libera' check (ancora in ('libera','ora_fissa','preghiera')),
  ora           time,
  preghiera     text check (preghiera in ('fajr','shuruq','zuhr','asr','maghrib','isha')),
  offset_min    smallint not null default 0,
  ricorrenza    jsonb not null default '{"tipo":"quotidiana"}'::jsonb,
  ricorrenza_id uuid references public.ricorrenze(id) on delete set null,
  inizio        date not null default current_date,
  fine          date,
  attiva        boolean not null default true,
  ripetizioni   text,
  ordine        integer not null default 0,
  creato_il     timestamptz not null default now(),
  check (ancora <> 'ora_fissa' or ora is not null),
  check (ancora <> 'preghiera' or preghiera is not null)
);
create index attivita_user_idx on public.attivita (user_id, attiva, momento);

-- fatto / saltato, giorno per giorno
create table public.spunte (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attivita_id uuid not null references public.attivita(id) on delete cascade,
  giorno      date not null,
  stato       text not null check (stato in ('fatto','saltato')),
  fatto_il    timestamptz not null default now(),
  primary key (user_id, attivita_id, giorno)
);
create index spunte_giorno_idx on public.spunte (user_id, giorno desc);

create table public.memorizzazione (
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aya_id             integer not null references public.ayat(id) on delete cascade,
  stato              text not null default 'nuovo' check (stato in ('nuovo','in_corso','consolidato')),
  data               date not null default current_date,   -- quando l'ho memorizzata
  ultima_ripetizione date,
  prossima_ripetizione date,
  forza              smallint check (forza between 0 and 5),
  primary key (user_id, aya_id)
);
create index memorizzazione_data_idx on public.memorizzazione (user_id, data desc);

-- piani di memorizzazione: uno solo attivo alla volta
create table public.piani_mem (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  inizio         date not null default current_date,
  fine           date,
  obiettivo_tipo text not null default 'corano'
                 check (obiettivo_tipo in ('corano','juz','hizb','sura','versetti')),
  obiettivo_n    jsonb,               -- quantita', oppure [67,78] per le sure scelte
  obiettivo      integer not null,    -- in versetti, congelato all'avvio
  base           integer not null default 0,
  stato          text not null default 'attivo' check (stato in ('attivo','sospeso','completato')),
  completato_il  date,
  creato_il      timestamptz not null default now()
);
create unique index piani_mem_uno_attivo on public.piani_mem (user_id) where stato = 'attivo';

create table public.evidenziazioni (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aya_id    integer not null references public.ayat(id) on delete cascade,
  colore    text not null default 'ottone',
  nota      text,
  creato_il timestamptz not null default now(),
  primary key (user_id, aya_id)
);

-- ------------------------------------------------------------
-- trigger modificato_il
-- ------------------------------------------------------------
create trigger hadith_tocca before update on public.hadith
  for each row execute function public.tocca_modificato();
create trigger voci_tocca before update on public.voci
  for each row execute function public.tocca_modificato();
create trigger impostazioni_tocca before update on public.impostazioni
  for each row execute function public.tocca_modificato();

-- profilo automatico alla registrazione
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profili (id, nome) values (new.id, new.raw_user_meta_data->>'nome')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger su_nuovo_utente after insert on auth.users
  for each row execute function public.crea_profilo();

-- ============================================================
-- RLS
-- ============================================================
alter table public.sure            enable row level security;
alter table public.ayat            enable row level security;
alter table public.ayat_traduzioni enable row level security;
alter table public.asma            enable row level security;
alter table public.fonti           enable row level security;
alter table public.hadith          enable row level security;
alter table public.voci            enable row level security;
alter table public.adhkar          enable row level security;
alter table public.ricorrenze      enable row level security;
alter table public.profili         enable row level security;
alter table public.impostazioni    enable row level security;
alter table public.luoghi          enable row level security;
alter table public.khatam          enable row level security;
alter table public.pensieri        enable row level security;
alter table public.legami          enable row level security;
alter table public.attivita        enable row level security;
alter table public.spunte          enable row level security;
alter table public.memorizzazione  enable row level security;
alter table public.piani_mem       enable row level security;
alter table public.evidenziazioni  enable row level security;

-- --- canonico: chiunque legge, solo admin scrive ---
do $$
declare t text;
begin
  foreach t in array array['sure','ayat','asma','fonti','hadith','voci','adhkar','ricorrenze'] loop
    execute format('create policy "%s_lettura_pubblica" on public.%I for select using (true)', t, t);
    execute format('create policy "%s_scrittura_admin" on public.%I for all
                    using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- --- traduzioni: SOLO utenti autenticati (copyright: uso personale) ---
create policy "traduzioni_solo_autenticati" on public.ayat_traduzioni
  for select to authenticated using (true);
create policy "traduzioni_scrittura_admin" on public.ayat_traduzioni
  for all using (public.is_admin()) with check (public.is_admin());

-- --- personale: ognuno vede e tocca solo il proprio ---
do $$
declare t text;
begin
  foreach t in array array['impostazioni','luoghi','khatam','pensieri','attivita',
                           'spunte','memorizzazione','piani_mem','evidenziazioni'] loop
    execute format('create policy "%s_proprio" on public.%I for all
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end $$;

create policy "profili_proprio" on public.profili
  for all using (id = auth.uid()) with check (id = auth.uid());

-- --- legami: i canonici (user_id null) li leggono tutti, i propri solo tu ---
create policy "legami_lettura" on public.legami
  for select using (user_id is null or user_id = auth.uid());
create policy "legami_propri" on public.legami
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "legami_canonici_admin" on public.legami
  for all using (user_id is null and public.is_admin())
  with check (user_id is null and public.is_admin());
