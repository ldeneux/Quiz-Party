-- Chaîne complète et vérifiée : crée un pack, y insère 3 questions
-- explicitement rattachées, crée un profil de test et l'attache au pack.
-- Utilise des variables explicites (pas de sous-requête de correspondance
-- par nom qui pourrait échouer silencieusement).

do $$
declare
  v_category_id uuid;
  v_pack_id uuid;
  v_profile_id uuid;
begin
  -- 1) Récupère la catégorie (échoue clairement si introuvable, au lieu
  --    de silencieusement créer un pack orphelin)
  select id into v_category_id from categories where name = 'Espace et système solaire';
  if v_category_id is null then
    raise exception 'Catégorie "Espace et système solaire" introuvable en base';
  end if;

  -- 2) Crée le pack
  insert into question_packs (name, level_id, category_id)
  values ('CM1 · Test manuel v2', 'CM1', v_category_id)
  returning id into v_pack_id;

  -- 3) Insère les 3 questions, rattachées explicitement à ce pack
  insert into questions (pack_id, category_id, level_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, validated)
  values
    (v_pack_id, v_category_id, 'CM1',
     'Combien de planètes compte notre système solaire ?',
     '7 planètes', '8 planètes', '9 planètes', '10 planètes', 'b',
     'Depuis 2006, Pluton n''est plus classée comme planète mais comme "planète naine". Notre système solaire compte Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune.',
     true),
    (v_pack_id, v_category_id, 'CM1',
     'Quelle est la planète la plus proche du Soleil ?',
     'Vénus', 'Mercure', 'Mars', 'Terre', 'b',
     'Mercure est la planète la plus proche du Soleil, à environ 58 millions de kilomètres, et met seulement 88 jours à en faire le tour.',
     true),
    (v_pack_id, v_category_id, 'CM1',
     'Quelle planète est surnommée la "planète rouge" ?',
     'Jupiter', 'Vénus', 'Mars', 'Saturne', 'c',
     'Mars doit sa couleur rougeâtre à l''oxyde de fer (la rouille) qui recouvre une grande partie de sa surface.',
     true);

  -- 4) Crée un profil de test et l'attache au pack
  insert into quiz_profiles (name)
  values ('Profil de test')
  returning id into v_profile_id;

  insert into quiz_profile_packs (profile_id, pack_id)
  values (v_profile_id, v_pack_id);

  raise notice 'OK — pack_id=%, profile_id=%', v_pack_id, v_profile_id;
end $$;

-- Vérification : doit afficher "Profil de test" / "CM1 · Test manuel v2" / 3
select p.name as profil, pk.name as pack, count(q.id) as nb_questions
from quiz_profiles p
join quiz_profile_packs pp on pp.profile_id = p.id
join question_packs pk on pk.id = pp.pack_id
left join questions q on q.pack_id = pk.id
where p.name = 'Profil de test'
group by p.name, pk.name;
