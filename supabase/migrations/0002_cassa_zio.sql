-- ============================================================
-- 0002 — Cassa di famiglia (conto spese zio 3rbi)
-- Layer B, personale: user_id + RLS, come tutte le tabelle personali.
-- La pagina "Cassa zio" di Addukira legge e scrive qui.
-- ============================================================

create table public.cassa_movimenti (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data           date not null default current_date,
  tipo           text not null check (tipo in ('donazione', 'spesa')),
  importo        numeric(12,2) not null check (importo > 0),   -- sempre positivo: il tipo dice se entra o esce
  donatore_n     int,                                           -- solo per le donazioni: numero del donatore
  categoria      text,                                          -- solo per le spese
  descrizione    text not null default '',
  descrizione_dr text,                                          -- darija, facoltativa
  descrizione_ar text,                                          -- arabo, facoltativa
  creato_il      timestamptz not null default now(),
  modificato_il  timestamptz not null default now()
);
create index cassa_movimenti_user_data_idx on public.cassa_movimenti (user_id, data desc, creato_il desc);

-- chi è il donatore n. X: privato, la pagina lo mostra solo a chi lo chiede
create table public.cassa_donatori (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  n         int  not null,
  nome      text not null,
  note      text,
  primary key (user_id, n)
);

create or replace function public.cassa_touch()
returns trigger language plpgsql as $$
begin
  new.modificato_il := now();
  return new;
end $$;

create trigger cassa_movimenti_touch_tr
  before update on public.cassa_movimenti
  for each row execute function public.cassa_touch();

alter table public.cassa_movimenti enable row level security;
alter table public.cassa_donatori  enable row level security;

create policy cassa_movimenti_own on public.cassa_movimenti
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cassa_donatori_own on public.cassa_donatori
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.cassa_movimenti, public.cassa_donatori to authenticated;
