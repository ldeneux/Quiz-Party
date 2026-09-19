alter table quiz_profiles add column if not exists is_favorite boolean default false;

-- Sécurité : s'assurer que la contrainte d'unicité sur categories.name existe
-- (idempotent, ne plante pas si déjà présente)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_name_unique'
  ) then
    alter table categories add constraint categories_name_unique unique (name);
  end if;
end $$;

notify pgrst, 'reload schema';
