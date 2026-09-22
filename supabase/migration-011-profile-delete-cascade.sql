-- La contrainte de clé étrangère sur games.profile_id bloquait la
-- suppression d'un profil dès qu'une partie (même terminée) y faisait
-- référence. On passe en CASCADE : supprimer un profil supprime aussi
-- les parties qui l'utilisaient (et donc leurs équipes/réponses, déjà
-- en cascade depuis le schéma d'origine).

alter table games drop constraint if exists games_profile_id_fkey;
alter table games add constraint games_profile_id_fkey
  foreign key (profile_id) references quiz_profiles(id) on delete cascade;

notify pgrst, 'reload schema';
