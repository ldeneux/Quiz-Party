-- Ajoute le mode de jeu sur la partie, et autorise la déconnexion d'équipe
-- (suppression de sa ligne dans `teams`), déclenchable côté hôte ou côté équipe.

alter table games add column if not exists mode text default 'classique';

create policy "public delete teams" on teams for delete using (true);
