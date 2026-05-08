-- Retired agent permission toggles; canonical wiki updates now use fixed pending-edit review flows.
alter table public.project_settings
  drop column if exists auto_synthesize_on_ingest,
  drop column if exists auto_create_entity_pages;
