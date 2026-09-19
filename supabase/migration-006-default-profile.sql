alter table quiz_profiles add column if not exists is_default boolean default false;

-- Garantit qu'un seul profil peut être "par défaut" à la fois
create unique index if not exists quiz_profiles_single_default
  on quiz_profiles ((is_default))
  where is_default = true;

notify pgrst, 'reload schema';
