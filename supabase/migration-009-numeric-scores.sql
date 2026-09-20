-- Le mode Participatif redistribue des parts de cagnotte qui peuvent être
-- décimales (ex. 8.75 pts). La colonne score était un entier — on la
-- passe en numeric, et on adapte la fonction d'incrément en conséquence.

alter table teams alter column score type numeric using score::numeric;

drop function if exists increment_team_score(uuid, int);

create or replace function increment_team_score(p_team_id uuid, p_points numeric)
returns void as $$
begin
  update teams set score = score + p_points where id = p_team_id;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
