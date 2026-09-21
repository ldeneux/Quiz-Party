-- Mode Camemberts : progression par catégorie, jokers, et catégories
-- retenues comme "parts" pour cette partie.

alter table teams add column if not exists camembert_progress jsonb default '{}'::jsonb;
alter table teams add column if not exists camembert_won text[] default array[]::text[];
alter table teams add column if not exists camembert_jokers int default 0;

alter table games add column if not exists camembert_categories jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
