-- Migration à exécuter si tu as déjà lancé schema.sql une première fois
-- (ajoute les colonnes de configuration à la table games existante)

alter table games add column if not exists level_ids text[] default array['CM1'];
alter table games add column if not exists category_ids uuid[] default array[]::uuid[];

-- Si ce n'est pas déjà fait (cf. correctif précédent) :
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table answers;
