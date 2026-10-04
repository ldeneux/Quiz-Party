-- =========================================================
-- Refonte de l'écran Paramétrage
--  - niveaux configurables : icône, « niveau scolaire », masqué dans le tableau
--  - vue de comptage des questions par couple catégorie × niveau (chargement léger de l'écran)
-- À exécuter une fois dans l'éditeur SQL de Supabase.
-- =========================================================

alter table difficulty_levels add column if not exists emoji text;
alter table difficulty_levels add column if not exists is_school boolean not null default false;
alter table difficulty_levels add column if not exists is_hidden boolean not null default false;

-- Les niveaux existants de l'école primaire sont des niveaux scolaires
update difficulty_levels set is_school = true where id in ('CP', 'CE1', 'CE2', 'CM1', 'CM2');

-- Questions par pack : jointure rapide
create index if not exists idx_questions_pack on questions(pack_id);

-- Nombre de questions par couple catégorie × niveau (une ligne par couple qui a au moins un pack).
-- Remplace le téléchargement de TOUTES les questions pour les compter (limité à 1000 lignes par Supabase).
create or replace view v_pair_question_counts as
select p.category_id, p.level_id, count(q.id)::int as n
from question_packs p
left join questions q on q.pack_id = p.id
group by p.category_id, p.level_id;

grant select on v_pair_question_counts to anon, authenticated;

notify pgrst, 'reload schema';
