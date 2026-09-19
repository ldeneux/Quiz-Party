-- =========================================================
-- Fix robuste des droits d'accès pour les tables Quiz Party.
--
-- Contrairement au correctif précédent (RLS désactivé), celui-ci
-- ACTIVE RLS et ajoute une politique explicite "using (true)".
-- Comme ce projet Supabase est partagé avec une autre application
-- qui semble réactiver RLS sur les tables publiques (bonne pratique
-- de sécurité côté serveur, mais qui cassait notre accès anonyme),
-- avoir RLS activé + une politique permissive est plus robuste que
-- de compter sur RLS désactivé, qui peut être écrasé.
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'difficulty_levels', 'questions', 'question_packs', 'quiz_profiles', 'quiz_profile_packs']
  loop
    execute format('alter table %I enable row level security', t);

    -- Supprime une éventuelle politique du même nom pour repartir propre
    execute format('drop policy if exists "quiz_party_public_all" on %I', t);

    execute format(
      'create policy "quiz_party_public_all" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Vérification : doit afficher rowsecurity = true pour ces 6 tables
select relname, relrowsecurity
from pg_class
where relname in ('categories', 'difficulty_levels', 'questions', 'question_packs', 'quiz_profiles', 'quiz_profile_packs');
