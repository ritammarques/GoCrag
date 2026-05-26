-- ═══════════════════════════════════════════════════════
-- GoCrag — Supabase Schema
-- Corre este ficheiro no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- para coordenadas geo (opcional)

-- ─── PROFILES ──────────────────────────────────────────
-- Extende a tabela auth.users do Supabase com dados de perfil
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  level        text default 'Iniciante', -- Iniciante / Intermédio / Avançado
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Trigger: cria perfil automaticamente quando o utilizador se regista
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── SPOTS ─────────────────────────────────────────────
create table public.spots (
  id           uuid default uuid_generate_v4() primary key,
  name         text not null,
  description  text,
  location     text,                    -- nome legível (ex: "Sintra, Portugal")
  lat          double precision not null,
  lng          double precision not null,
  rock_type    text,                    -- Granito / Calcário / Xisto / etc.
  level_min    text,                    -- ex: "4a"
  level_max    text,                    -- ex: "8a+"
  style        text default 'Boulder',
  walk_time    text,                    -- ex: "10-15 min"
  how_to_get   text,
  cover_url    text,                    -- foto de capa
  added_by     uuid references public.profiles(id),
  is_published boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── SECTORS ───────────────────────────────────────────
-- Um spot tem vários sectores (zonas de escalada)
create table public.sectors (
  id          uuid default uuid_generate_v4() primary key,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  name        text not null,            -- ex: "Principal", "Bosque"
  description text,
  order_index int default 0,            -- ordem de apresentação
  cover_url   text,
  created_at  timestamptz default now()
);

-- ─── CHALLENGES (Problemas/Desafios) ──────────────────
-- Um sector tem vários problemas de escalada
create table public.challenges (
  id          uuid default uuid_generate_v4() primary key,
  sector_id   uuid references public.sectors(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null, -- desnormalizado para queries rápidas
  name        text not null,            -- ex: "Alma Pequena"
  grade       text,                     -- ex: "6C", "7A+", "8B"
  description text,
  style       text,                     -- ex: "Dyno", "Crimpy", "Sloper"
  height_m    float,                    -- altura em metros
  landing     text,                     -- ex: "Boa", "Razoável", "Má"
  added_by    uuid references public.profiles(id),
  order_index int default 0,
  created_at  timestamptz default now()
);

-- ─── UPLOADS ───────────────────────────────────────────
-- Fotos, vídeos e PDFs — podem pertencer a spot/sector/challenge
create table public.uploads (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  -- Pode pertencer a qualquer um destes (apenas um de cada vez)
  spot_id       uuid references public.spots(id) on delete cascade,
  sector_id     uuid references public.sectors(id) on delete cascade,
  challenge_id  uuid references public.challenges(id) on delete cascade,
  -- Dados do ficheiro
  file_type     text not null,          -- 'photo' | 'video' | 'doc' | 'croqis'
  file_name     text not null,
  storage_path  text not null,          -- caminho no Supabase Storage
  public_url    text not null,          -- URL pública para acesso
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz default now(),
  -- Garante que pertence a pelo menos uma entidade
  constraint uploads_belongs_to_one check (
    (spot_id is not null)::int +
    (sector_id is not null)::int +
    (challenge_id is not null)::int >= 1
  )
);

-- ─── NOTES / COMMENTS ──────────────────────────────────
-- Notas da comunidade sobre um spot/sector/challenge
create table public.notes (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  spot_id       uuid references public.spots(id) on delete cascade,
  sector_id     uuid references public.sectors(id) on delete cascade,
  challenge_id  uuid references public.challenges(id) on delete cascade,
  content       text not null,
  rating        int check (rating between 1 and 5),  -- 1-5 estrelas (opcional)
  condition_tag text,                   -- 'good' | 'ok' | 'bad' — confirmação de condição
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── FAVORITES ─────────────────────────────────────────
create table public.favorites (
  user_id    uuid references public.profiles(id) on delete cascade,
  spot_id    uuid references public.spots(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, spot_id)
);

-- ─── SESSIONS / LOGBOOK (preparado para futura gamification) ──
create table public.sessions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  date        date not null default current_date,
  duration_m  int,                      -- duração em minutos
  notes       text,
  created_at  timestamptz default now()
);

-- ─── ÍNDICES para performance ──────────────────────────
create index on public.spots(lat, lng);
create index on public.sectors(spot_id);
create index on public.challenges(sector_id);
create index on public.challenges(spot_id);
create index on public.uploads(spot_id);
create index on public.uploads(sector_id);
create index on public.uploads(challenge_id);
create index on public.notes(spot_id);
create index on public.favorites(user_id);

-- ─── ROW LEVEL SECURITY ────────────────────────────────
-- Activa RLS em todas as tabelas (boa prática de segurança)
alter table public.profiles   enable row level security;
alter table public.spots      enable row level security;
alter table public.sectors    enable row level security;
alter table public.challenges enable row level security;
alter table public.uploads    enable row level security;
alter table public.notes      enable row level security;
alter table public.favorites  enable row level security;
alter table public.sessions   enable row level security;

-- Policies: leitura pública, escrita autenticada
-- Spots: toda a gente pode ler
create policy "spots_public_read"  on public.spots   for select using (is_published = true);
create policy "spots_auth_insert"  on public.spots   for insert with check (auth.uid() is not null);
create policy "spots_owner_update" on public.spots   for update using (added_by = auth.uid());

-- Sectors e Challenges: leitura pública
create policy "sectors_public_read"    on public.sectors    for select using (true);
create policy "challenges_public_read" on public.challenges for select using (true);
create policy "sectors_auth_insert"    on public.sectors    for insert with check (auth.uid() is not null);
create policy "challenges_auth_insert" on public.challenges for insert with check (auth.uid() is not null);

-- Uploads: leitura pública, escrita autenticada, delete próprio
create policy "uploads_public_read"  on public.uploads for select using (true);
create policy "uploads_auth_insert"  on public.uploads for insert with check (auth.uid()::uuid = user_id);
create policy "uploads_owner_delete" on public.uploads for delete using (auth.uid()::uuid = user_id);

-- Notes: leitura pública, escrita autenticada
create policy "notes_public_read"  on public.notes for select using (true);
create policy "notes_auth_insert"  on public.notes for insert with check (auth.uid()::uuid = user_id);
create policy "notes_owner_update" on public.notes for update using (auth.uid()::uuid = user_id);
create policy "notes_owner_delete" on public.notes for delete using (auth.uid()::uuid = user_id);

-- Favorites: só o próprio utilizador
create policy "favorites_own" on public.favorites for all using (auth.uid()::uuid = user_id);

-- Profiles: leitura pública, edição própria
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_own_update"   on public.profiles for update using (auth.uid() = id);

-- Sessions: só o próprio utilizador
create policy "sessions_own" on public.sessions for all using (auth.uid()::uuid = user_id);
