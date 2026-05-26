-- ═══════════════════════════════════════════════════════
-- GoCrag — Schema Completo v2
-- Inclui: tabelas, RLS completo, Storage policies
-- Corre no Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════

-- ─── Extensões ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════════
-- TABELAS
-- ═══════════════════════════════════════════════════════

-- ─── PROFILES ───────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  level        text default 'Iniciante',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Trigger: cria perfil automaticamente no registo
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── SPOTS ──────────────────────────────────────────────
create table if not exists public.spots (
  id           uuid default uuid_generate_v4() primary key,
  name         text not null,
  description  text,
  location     text,
  lat          double precision not null,
  lng          double precision not null,
  rock_type    text,
  level_min    text,
  level_max    text,
  style        text default 'Boulder',
  walk_time    text,
  how_to_get   text,
  cover_url    text,
  added_by     uuid references public.profiles(id) on delete set null,
  is_published boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── SECTORS ────────────────────────────────────────────
create table if not exists public.sectors (
  id          uuid default uuid_generate_v4() primary key,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  name        text not null,
  description text,
  order_index int default 0,
  cover_url   text,
  created_at  timestamptz default now()
);

-- ─── CHALLENGES ─────────────────────────────────────────
create table if not exists public.challenges (
  id          uuid default uuid_generate_v4() primary key,
  sector_id   uuid references public.sectors(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  name        text not null,
  grade       text,
  description text,
  style       text,
  height_m    float,
  landing     text,
  added_by    uuid references public.profiles(id) on delete set null,
  order_index int default 0,
  created_at  timestamptz default now()
);

-- ─── UPLOADS ────────────────────────────────────────────
create table if not exists public.uploads (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  spot_id       uuid references public.spots(id) on delete cascade,
  sector_id     uuid references public.sectors(id) on delete cascade,
  challenge_id  uuid references public.challenges(id) on delete cascade,
  file_type     text not null check (file_type in ('photo','video','doc','croqis')),
  file_name     text not null,
  storage_path  text not null unique,
  public_url    text not null,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz default now()
);

-- ─── NOTES ──────────────────────────────────────────────
create table if not exists public.notes (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  spot_id       uuid references public.spots(id) on delete cascade,
  sector_id     uuid references public.sectors(id) on delete cascade,
  challenge_id  uuid references public.challenges(id) on delete cascade,
  content       text not null,
  rating        int check (rating between 1 and 5),
  condition_tag text check (condition_tag in ('good','ok','bad')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── FAVORITES ──────────────────────────────────────────
create table if not exists public.favorites (
  user_id    uuid references public.profiles(id) on delete cascade,
  spot_id    uuid references public.spots(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, spot_id)
);

-- ─── SESSIONS (logbook — para futura gamification) ──────
create table if not exists public.sessions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  date        date not null default current_date,
  duration_m  int,
  notes       text,
  created_at  timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════
create index if not exists idx_spots_published    on public.spots(is_published) where is_published = true;
create index if not exists idx_spots_location     on public.spots(lat, lng);
create index if not exists idx_sectors_spot       on public.sectors(spot_id);
create index if not exists idx_challenges_sector  on public.challenges(sector_id);
create index if not exists idx_challenges_spot    on public.challenges(spot_id);
create index if not exists idx_uploads_spot       on public.uploads(spot_id);
create index if not exists idx_uploads_sector     on public.uploads(sector_id);
create index if not exists idx_uploads_challenge  on public.uploads(challenge_id);
create index if not exists idx_uploads_user       on public.uploads(user_id);
create index if not exists idx_notes_spot         on public.notes(spot_id);
create index if not exists idx_notes_challenge    on public.notes(challenge_id);
create index if not exists idx_favorites_user     on public.favorites(user_id);
create index if not exists idx_sessions_user      on public.sessions(user_id);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════

-- Activa RLS em todas as tabelas
alter table public.profiles   enable row level security;
alter table public.spots      enable row level security;
alter table public.sectors    enable row level security;
alter table public.challenges enable row level security;
alter table public.uploads    enable row level security;
alter table public.notes      enable row level security;
alter table public.favorites  enable row level security;
alter table public.sessions   enable row level security;

-- ── PROFILES ─────────────────────────────────────────────
-- Qualquer pessoa pode ler perfis
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (true);

-- Cada utilizador só pode editar o seu próprio perfil
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- O trigger cria o perfil — necessário insert para service_role
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- ── SPOTS ────────────────────────────────────────────────
-- Leitura pública de spots publicados
drop policy if exists "spots_select" on public.spots;
create policy "spots_select" on public.spots
  for select using (is_published = true);

-- Utilizadores autenticados podem criar spots
drop policy if exists "spots_insert" on public.spots;
create policy "spots_insert" on public.spots
  for insert with check (auth.uid() is not null and auth.uid() = added_by);

-- Só o criador pode editar o seu spot
drop policy if exists "spots_update" on public.spots;
create policy "spots_update" on public.spots
  for update using (auth.uid() = added_by);

-- ── SECTORS ──────────────────────────────────────────────
drop policy if exists "sectors_select" on public.sectors;
create policy "sectors_select" on public.sectors
  for select using (true);

drop policy if exists "sectors_insert" on public.sectors;
create policy "sectors_insert" on public.sectors
  for insert with check (auth.uid() is not null);

-- ── CHALLENGES ───────────────────────────────────────────
drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges
  for select using (true);

drop policy if exists "challenges_insert" on public.challenges;
create policy "challenges_insert" on public.challenges
  for insert with check (auth.uid() is not null);

-- ── UPLOADS ──────────────────────────────────────────────
-- Leitura pública
drop policy if exists "uploads_select" on public.uploads;
create policy "uploads_select" on public.uploads
  for select using (true);

-- Só o próprio utilizador pode fazer upload
drop policy if exists "uploads_insert" on public.uploads;
create policy "uploads_insert" on public.uploads
  for insert with check (auth.uid() = user_id);

-- Só o próprio pode apagar
drop policy if exists "uploads_delete" on public.uploads;
create policy "uploads_delete" on public.uploads
  for delete using (auth.uid() = user_id);

-- ── NOTES ────────────────────────────────────────────────
-- Leitura pública
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (true);

-- Criar nota: tem de ser o próprio
drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert with check (auth.uid() = user_id);

-- Editar/apagar a própria nota
drop policy if exists "notes_update" on public.notes;
create policy "notes_update" on public.notes
  for update using (auth.uid() = user_id);

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (auth.uid() = user_id);

-- ── FAVORITES ────────────────────────────────────────────
drop policy if exists "favorites_all" on public.favorites;
create policy "favorites_all" on public.favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── SESSIONS ─────────────────────────────────────────────
drop policy if exists "sessions_all" on public.sessions;
create policy "sessions_all" on public.sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- STORAGE BUCKET E POLICIES
-- Nota: o bucket deve ser criado manualmente no Dashboard
-- mas as policies podem ser aplicadas via SQL.
-- ═══════════════════════════════════════════════════════

-- Cria o bucket "uploads" se não existir
-- (Pode dar erro se já existir — ignora)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Qualquer pessoa pode ler (URLs públicas)
drop policy if exists "storage_uploads_select" on storage.objects;
create policy "storage_uploads_select" on storage.objects
  for select using (bucket_id = 'uploads');

-- Só utilizadores autenticados podem fazer upload
-- O path tem de começar com o userId para garantir isolamento
drop policy if exists "storage_uploads_insert" on storage.objects;
create policy "storage_uploads_insert" on storage.objects
  for insert with check (
    bucket_id = 'uploads'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Só o próprio pode apagar os seus ficheiros
drop policy if exists "storage_uploads_delete" on storage.objects;
create policy "storage_uploads_delete" on storage.objects
  for delete using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Só o próprio pode actualizar (ex: substituir ficheiro)
drop policy if exists "storage_uploads_update" on storage.objects;
create policy "storage_uploads_update" on storage.objects
  for update using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
