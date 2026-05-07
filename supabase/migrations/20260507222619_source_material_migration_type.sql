alter table public.source_materials
  drop constraint if exists source_materials_type_check;

alter table public.source_materials
  add constraint source_materials_type_check
  check (type in ('document', 'email', 'meeting', 'note', 'migration'));
