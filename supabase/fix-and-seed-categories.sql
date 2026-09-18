-- =========================================================
-- Correctif : colonnes manquantes sur `games` + liste complète
-- des catégories de questions. À coller tel quel dans l'éditeur
-- SQL de Supabase.
-- =========================================================

-- 1) Colonnes manquantes sur games (idempotent, ne casse rien si déjà là)
alter table games add column if not exists level_ids text[] default array['CM1'];
alter table games add column if not exists category_ids uuid[] default array[]::uuid[];
alter table games add column if not exists mode text default 'classique';

-- 2) Contrainte d'unicité sur le nom de catégorie, pour pouvoir
--    relancer ce script sans créer de doublons
alter table categories add constraint categories_name_unique unique (name);

-- 3) Liste complète des catégories (50+)
insert into categories (name, emoji) values
  -- Scolaire primaire (CP à CM2)
  ('Calcul mental', '🧮'),
  ('Géométrie', '📐'),
  ('Conjugaison', '📝'),
  ('Orthographe', '✍️'),
  ('Vocabulaire', '📖'),
  ('Lecture et contes', '📚'),
  ('Géographie de la France', '🗺️'),
  ('Histoire de France', '🏰'),
  ('Sciences de la vie', '🔬'),
  ('Espace et système solaire', '🪐'),
  ('Arts visuels', '🎨'),
  ('Musique classique', '🎻'),
  ('Sport et règles du jeu', '⚽'),
  ('Mythologie grecque', '⚡'),
  ('Drapeaux et pays', '🏳️'),
  ('Inventions et inventeurs', '💡'),
  ('Monuments du monde', '🗽'),
  ('Écologie et nature', '🌱'),

  -- Ado
  ('Cinéma et séries', '🎬'),
  ('Musique actuelle', '🎤'),
  ('Jeux vidéo', '🎮'),
  ('Culture web et réseaux sociaux', '📱'),
  ('Sport (compétitions, records)', '🏆'),
  ('BD et manga', '📔'),
  ('Sciences (physique-chimie)', '⚗️'),
  ('Histoire du XXe siècle', '🎖️'),
  ('Géographie du monde', '🌍'),
  ('Langues étrangères', '🗣️'),
  ('Mode et tendances', '👟'),
  ('Célébrités', '⭐'),
  ('Logos et marques', '🏷️'),
  ('Anime et animation', '🎏'),

  -- Adulte / culture générale poussée
  ('Cinéma classique', '🎞️'),
  ('Musique (tous genres)', '🎵'),
  ('Littérature', '📕'),
  ('Histoire (toutes époques)', '🏛️'),
  ('Géopolitique', '🌐'),
  ('Sciences avancées', '🧪'),
  ('Gastronomie et vins', '🍷'),
  ('Peinture et sculpture', '🖼️'),
  ('Économie', '📈'),
  ('Sport professionnel', '🥇'),
  ('Séries TV cultes', '📺'),
  ('Philosophie', '🤔'),
  ('Droit et institutions', '⚖️'),
  ('Automobile', '🚗'),
  ('Technologie et informatique', '💻'),
  ('Voyages et capitales', '✈️'),
  ('Théâtre', '🎭'),
  ('Photographie', '📷'),
  ('Architecture', '🏗️'),
  ('Mythologies du monde', '🐉'),
  ('Jeux vidéo rétro', '🕹️'),
  ('Actualité et médias', '📰'),
  ('Astronomie', '🔭'),
  ('Médecine et santé (culture générale)', '🩺'),
  ('Œnologie', '🍇'),
  ('Humour et sketchs cultes', '😂')
on conflict (name) do nothing;

-- 4) Force PostgREST à recharger son cache de schéma
--    (indispensable après un ALTER TABLE, sinon l'API continue
--    de renvoyer "colonne introuvable" même une fois ajoutée)
notify pgrst, 'reload schema';
