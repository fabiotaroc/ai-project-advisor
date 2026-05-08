-- Retired user-facing proactivity; canonical wiki + proposal flow is fixed per product spec.
alter table public.project_settings
  drop column if exists proactivity;
