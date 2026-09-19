-- Même correctif robuste que fix-permissions-v2-robust.sql, appliqué
-- cette fois à `teams` et `answers` : ces tables avaient déjà des
-- politiques, mais aucune n'autorisait la mise à jour (update), ce qui
-- bloque silencieusement le calcul des scores. Et si RLS a été
-- réactivé entre-temps sur ces tables (même phénomène que `categories`),
-- ça expliquerait aussi que le timer n'ait pas su que tout le monde
-- avait répondu.

do $$
declare
  t text;
begin
  foreach t in array array['teams', 'answers']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "quiz_party_public_all" on %I', t);
    execute format(
      'create policy "quiz_party_public_all" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

select relname, relrowsecurity from pg_class where relname in ('teams', 'answers');
