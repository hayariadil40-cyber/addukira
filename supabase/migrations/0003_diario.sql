-- ============================================================
-- 0003 — Diario personale
-- Layer B, personale: user_id + RLS, come tutte le tabelle personali.
-- Una riga = una pagina del diario. La pagina "Diario" di Addukira
-- legge e scrive qui. È il luogo dedicato che prima mancava: le note
-- di vita personale stavano nei pensieri, con il testo che iniziava
-- per "PERSONAL — ".
-- ============================================================

create table public.diario (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  giorno         date not null default current_date,
  titolo         text not null default '',
  testo          text not null default '',
  creato_il      timestamptz not null default now(),
  modificato_il  timestamptz not null default now()
);
create index diario_user_giorno_idx on public.diario (user_id, giorno, creato_il);

create or replace function public.diario_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.modificato_il := now();
  return new;
end $$;

create trigger diario_touch_tr
  before update on public.diario
  for each row execute function public.diario_touch();

alter table public.diario enable row level security;

create policy diario_own on public.diario
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.diario to authenticated;

-- ------------------------------------------------------------
-- Trasloco: i pensieri "PERSONAL — …" diventano pagine del diario.
-- Titolo = prima riga senza il prefisso; se il pensiero è di una riga
-- sola, il titolo è la parte prima dei due punti. Poi escono dai pensieri
-- (nessuno aveva legami).
-- ------------------------------------------------------------
with src as (
  select id, user_id, giorno, creato_il,
         regexp_replace(testo, '^PERSONAL\s*[—–-]\s*', '') as corpo
  from public.pensieri
  where testo ~ '^PERSONAL\s*[—–-]'
), parti as (
  select id, user_id, giorno, creato_il, corpo,
         position(E'\n' in corpo) as nl,
         position(': ' in corpo) as dp
  from src
), ins as (
  insert into public.diario (user_id, giorno, titolo, testo, creato_il)
  select user_id, giorno,
         case when nl > 0 then btrim(left(corpo, nl - 1))
              when dp > 0 then btrim(left(corpo, dp - 1))
              else '' end,
         case when nl > 0 then btrim(substr(corpo, nl + 1), E' \n\r\t')
              when dp > 0 then btrim(substr(corpo, dp + 2))
              else btrim(corpo) end,
         creato_il
  from parti
  returning 1
)
delete from public.pensieri where id in (select id from src);
