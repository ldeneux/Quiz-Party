-- =========================================================
-- Correctif de droits d'accès (RLS / grants) pour les tables
-- Quiz Party. À exécuter si des tables comme `categories`
-- semblent vides côté application alors qu'elles contiennent
-- bien des données dans le Table Editor Supabase.
--
-- Ce projet Supabase étant partagé avec d'autres applications,
-- une politique de sécurité globale (RLS activé par défaut,
-- ou droits `anon` restreints) peut bloquer l'accès à nos
-- tables sans qu'on l'ait demandé explicitement.
-- =========================================================

alter table categories disable row level security;
grant select, insert, update, delete on categories to anon, authenticated;

alter table difficulty_levels disable row level security;
grant select on difficulty_levels to anon, authenticated;

alter table questions disable row level security;
grant select, insert, update, delete on questions to anon, authenticated;

alter table question_packs disable row level security;
grant select, insert, update, delete on question_packs to anon, authenticated;

alter table quiz_profiles disable row level security;
grant select, insert, update, delete on quiz_profiles to anon, authenticated;

alter table quiz_profile_packs disable row level security;
grant select, insert, update, delete on quiz_profile_packs to anon, authenticated;

notify pgrst, 'reload schema';

-- Pour vérifier toi-même l'état RLS d'une table à tout moment :
-- select relname, relrowsecurity from pg_class where relname = 'categories';
