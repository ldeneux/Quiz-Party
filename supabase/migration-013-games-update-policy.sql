-- La table `games` n'avait qu'une politique SELECT (schema.sql). Tous les
-- UPDATE faits depuis le navigateur (profile_id, mode, camembert_categories,
-- status, current_question_id...) étaient refusés silencieusement par RLS
-- (0 ligne modifiée, aucune erreur). C'est pour ça que le profil choisi
-- n'était pris en compte qu'à la création du code de partie (insert fait
-- côté serveur avec la service role).
-- Même correctif que migration-007 (teams / answers).

alter table games enable row level security;
drop policy if exists "quiz_party_public_all" on games;
create policy "quiz_party_public_all" on games
  for all using (true) with check (true);

notify pgrst, 'reload schema';

select relname, relrowsecurity from pg_class where relname = 'games';
