-- =========================================================
-- QUIZ PARTY — Schéma de base de données Supabase (V1)
-- =========================================================
-- À exécuter dans l'éditeur SQL de ton projet Supabase.
-- Ce schéma couvre : profils de jeu, questions, parties,
-- équipes, manches, réponses. Le mode CLASSIQUE est
-- entièrement supporté ; les autres modes (DÉFI, SURVIE,
-- PARTICIPATIF) réutilisent les mêmes tables avec des champs
-- additionnels (voir commentaires).

-- ---------------------------------------------------------
-- 1. Catégories de questions (thèmes de contenu)
-- ---------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- "Culture générale", "Maths", ...
  emoji text default '❓',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 2. Niveaux de difficulté
-- ---------------------------------------------------------
create table difficulty_levels (
  id text primary key,          -- 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'ADO', 'ADULTE'
  label text not null,
  sort_order int not null
);

insert into difficulty_levels (id, label, sort_order) values
  ('CP', 'CP', 1),
  ('CE1', 'CE1', 2),
  ('CE2', 'CE2', 3),
  ('CM1', 'CM1', 4),
  ('CM2', 'CM2', 5),
  ('ADO', 'Ado', 6),
  ('ADULTE', 'Adulte', 7);

-- ---------------------------------------------------------
-- 3. Questions (banque, générée en batch via IA + validée)
-- ---------------------------------------------------------
create table questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  level_id text references difficulty_levels(id),
  prompt text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_choice char(1) not null check (correct_choice in ('a','b','c','d')),
  explanation text,             -- réponse éducative (quelques lignes)
  diagram_url text,             -- schéma/illustration optionnel
  validated boolean default false, -- validé par un enseignant avant mise en prod
  created_at timestamptz default now()
);

create index idx_questions_category_level on questions(category_id, level_id);

-- ---------------------------------------------------------
-- 4. Profils de jeu (combinaison niveau + catégories réutilisable)
-- ---------------------------------------------------------
create table game_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- "CM1 - Culture générale + Maths"
  level_ids text[] not null,         -- ex: ['CM1']
  category_ids uuid[] not null,      -- ex: [uuid1, uuid2]
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 5. Parties (sessions de jeu)
-- ---------------------------------------------------------
create table games (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,     -- code à 4-6 caractères pour rejoindre
  game_profile_id uuid references game_profiles(id),
  level_ids text[] default array['CM1'],       -- niveaux sélectionnés pour cette partie
  category_ids uuid[] default array[]::uuid[], -- catégories sélectionnées ([] = toutes)
  status text not null default 'lobby', -- lobby | question | revealed | finished
  current_round int default 0,
  current_question_id uuid references questions(id),
  question_started_at timestamptz,     -- pour calculer les temps de réponse serveur
  visual_theme text default 'espace',  -- 'espace' | 'jungle' | ... (5 thèmes)
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 6. Types de jeu jouables au sein d'une partie
--    (une session peut enchaîner plusieurs "parties" de jeu
--    différentes avec remise à zéro des scores)
-- ---------------------------------------------------------
create table game_rounds_meta (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  mode text not null,              -- 'classique' | 'defi' | 'survie' | 'participatif'
  target_score int,                -- ex: 150 pour classique
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- ---------------------------------------------------------
-- 7. Équipes
-- ---------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,            -- choisi parmi une liste de 10-20 propositions
  avatar text not null,          -- emoji/clipart associé
  color text not null,           -- couleur d'équipe (cohérente avec le thème)
  score int default 0,
  lives int default 3,           -- utilisé en mode SURVIE
  device_session_id text,        -- identifiant de session anonyme (pas de compte)
  joined_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 8. Réponses données à chaque question
-- ---------------------------------------------------------
create table answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  question_id uuid references questions(id),
  team_id uuid references teams(id) on delete cascade,
  round_number int not null,
  choice char(1),                 -- null = pas de réponse dans le temps imparti
  is_correct boolean,
  response_time_ms int,           -- calculé serveur (question_started_at -> réception)
  points_awarded int default 0,
  answered_at timestamptz default now(),
  unique (game_id, question_id, team_id)
);

-- ---------------------------------------------------------
-- Row Level Security — accès public en lecture/écriture limité
-- (application "sans compte", accès contrôlé par le join_code)
-- ---------------------------------------------------------
alter table games enable row level security;
alter table teams enable row level security;
alter table answers enable row level security;

-- Politique simple V1 : accès ouvert en lecture, écriture via anon key
-- (à durcir plus tard si besoin : ex. limiter l'update du score aux
-- fonctions Edge plutôt qu'au client direct)
create policy "public read games" on games for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public insert teams" on teams for insert with check (true);
create policy "public read answers" on answers for select using (true);
create policy "public insert answers" on answers for insert with check (true);

-- ---------------------------------------------------------
-- Activation du Realtime sur les tables suivies en direct
-- (indispensable : sans ça, l'écran hôte ne reçoit jamais les
-- équipes qui rejoignent ni les réponses soumises)
-- ---------------------------------------------------------
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table answers;
