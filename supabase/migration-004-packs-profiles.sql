-- =========================================================
-- Packs de questions + Profils
-- =========================================================

-- Un pack = un couple (niveau, catégorie), contenant N questions.
-- Plusieurs packs peuvent exister pour le même couple (pas d'unicité).
create table if not exists question_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level_id text references difficulty_levels(id),
  category_id uuid references categories(id),
  created_at timestamptz default now()
);

-- Rattache chaque question à son pack (en plus de category_id/level_id
-- déjà présents sur `questions`, gardés pour compatibilité).
alter table questions add column if not exists pack_id uuid references question_packs(id) on delete cascade;

-- Un profil = un nom + une sélection de packs. Les questions d'une
-- partie sont piochées aléatoirement dans l'union de tous les packs
-- du profil actif.
create table if not exists quiz_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists quiz_profile_packs (
  profile_id uuid references quiz_profiles(id) on delete cascade,
  pack_id uuid references question_packs(id) on delete cascade,
  primary key (profile_id, pack_id)
);

-- La partie mémorise le profil utilisé
alter table games add column if not exists profile_id uuid references quiz_profiles(id);

notify pgrst, 'reload schema';
