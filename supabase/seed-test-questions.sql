-- Jeu de données minimal pour tester le jeu (2 questions niveau CM1)
-- À coller dans l'éditeur SQL Supabase, après avoir exécuté
-- fix-and-seed-categories.sql (les catégories doivent déjà exister).

insert into questions (category_id, level_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, validated)
select id, 'CM1',
  'Combien de planètes compte notre système solaire ?',
  '7 planètes', '8 planètes', '9 planètes', '10 planètes', 'b',
  'Depuis 2006, Pluton n''est plus classée comme planète mais comme "planète naine". Notre système solaire compte Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune.',
  true
from categories where name = 'Espace et système solaire';

insert into questions (category_id, level_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, validated)
select id, 'CM1',
  'Combien de joueurs y a-t-il dans une équipe de football sur le terrain ?',
  '9', '10', '11', '12', 'c',
  'Une équipe de football aligne 11 joueurs sur le terrain, dont un gardien de but.',
  true
from categories where name = 'Sport et règles du jeu';
