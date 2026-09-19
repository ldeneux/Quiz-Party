-- Crée un pack de test manuel (3 questions, pas besoin de Gemini)
-- sur la catégorie "Espace et système solaire" niveau CM1.
-- Une fois créé, va dans Paramétrage pour l'ajouter à un profil.

with new_pack as (
  insert into question_packs (name, level_id, category_id)
  select 'CM1 · Test manuel', 'CM1', id from categories where name = 'Espace et système solaire'
  returning id
)
insert into questions (pack_id, category_id, level_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, validated)
select
  new_pack.id,
  (select id from categories where name = 'Espace et système solaire'),
  'CM1',
  v.prompt, v.choice_a, v.choice_b, v.choice_c, v.choice_d, v.correct_choice, v.explanation, true
from new_pack,
(values
  ('Combien de planètes compte notre système solaire ?', '7 planètes', '8 planètes', '9 planètes', '10 planètes', 'b', 'Depuis 2006, Pluton n''est plus classée comme planète mais comme "planète naine". Notre système solaire compte Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune.'),
  ('Quelle est la planète la plus proche du Soleil ?', 'Vénus', 'Mercure', 'Mars', 'Terre', 'b', 'Mercure est la planète la plus proche du Soleil, à environ 58 millions de kilomètres, ce qui en fait la plus rapide à orbiter (88 jours).'),
  ('Quelle planète est surnommée la "planète rouge" ?', 'Jupiter', 'Vénus', 'Mars', 'Saturne', 'c', 'Mars doit sa couleur rougeâtre à l''oxyde de fer (la rouille) qui recouvre une grande partie de sa surface.')
) as v(prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation);
