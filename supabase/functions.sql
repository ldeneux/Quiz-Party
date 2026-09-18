-- Incrémente le score d'une équipe de façon atomique
-- (évite les conflits si plusieurs mises à jour arrivent en même temps)

create or replace function increment_team_score(p_team_id uuid, p_points int)
returns void as $$
begin
  update teams set score = score + p_points where id = p_team_id;
end;
$$ language plpgsql;
