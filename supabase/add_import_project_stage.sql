-- Fase (lifecycle) do projeto de importação: negociacao -> embarcado -> transito -> concluido
-- Rode no SQL editor do Supabase.

ALTER TABLE import_projects
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'embarcado';

-- Backfill: projetos que já existem continuam contando como "em importação"
-- (default 'embarcado'); os que já estavam fechados viram 'concluido'.
UPDATE import_projects SET stage = 'embarcado' WHERE stage IS NULL;
UPDATE import_projects SET stage = 'concluido' WHERE status = 'closed';

-- (opcional) trava de valores válidos
ALTER TABLE import_projects DROP CONSTRAINT IF EXISTS import_projects_stage_check;
ALTER TABLE import_projects
ADD CONSTRAINT import_projects_stage_check
CHECK (stage IN ('negociacao', 'embarcado', 'transito', 'concluido'));
