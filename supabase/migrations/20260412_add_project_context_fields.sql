ALTER TABLE public.project_settings
  ADD COLUMN IF NOT EXISTS client_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS team_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_phase text DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_context text DEFAULT '';
