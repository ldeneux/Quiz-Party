-- round_number était NOT NULL sans valeur par défaut, mais le code actuel
-- (mode Classique) ne le renseigne pas encore — chaque insertion de
-- réponse échouait silencieusement à cause de cette contrainte.
alter table answers alter column round_number drop not null;
alter table answers alter column round_number set default 1;

notify pgrst, 'reload schema';
