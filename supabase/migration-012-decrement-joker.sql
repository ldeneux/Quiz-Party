create or replace function decrement_team_joker(p_team_id uuid)
returns void as $$
begin
  update teams set camembert_jokers = greatest(camembert_jokers - 1, 0) where id = p_team_id;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
