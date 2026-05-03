-- Inputs backend: type-specific detail tables + listing index (docs/INPUTS_BACKEND_DATA_MODEL.md)

alter table public.source_materials
  add column if not exists file_kind text;

comment on column public.source_materials.file_kind is
  'Secondary classifier for file-like sources (e.g. document, note, presentation, spreadsheet).';

create index if not exists idx_source_materials_project_type_created_at
  on public.source_materials (project_id, type, created_at desc);

create table if not exists public.source_file_details (
  source_material_id uuid primary key references public.source_materials(id) on delete cascade,
  original_filename text,
  mime_type text,
  file_extension text,
  file_size_bytes bigint,
  page_count integer,
  slide_count integer,
  sheet_count integer,
  word_count integer,
  language text,
  preview_status text,
  extraction_status text,
  extracted_title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_meeting_details (
  source_material_id uuid primary key references public.source_materials(id) on delete cascade,
  short_summary text,
  decisions jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  meeting_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_email_details (
  source_material_id uuid primary key references public.source_materials(id) on delete cascade,
  canonical_subject text,
  from_address text,
  to_addresses jsonb not null default '[]'::jsonb,
  cc_addresses jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  message_id text,
  in_reply_to text,
  "references" text,
  attachments jsonb not null default '[]'::jsonb,
  latest_state text,
  key_decisions jsonb not null default '[]'::jsonb,
  requested_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_source_file_details
  before update on public.source_file_details
  for each row execute function public.set_updated_at();

create trigger set_updated_at_source_meeting_details
  before update on public.source_meeting_details
  for each row execute function public.set_updated_at();

create trigger set_updated_at_source_email_details
  before update on public.source_email_details
  for each row execute function public.set_updated_at();

alter table public.source_file_details enable row level security;
alter table public.source_meeting_details enable row level security;
alter table public.source_email_details enable row level security;

create policy "source_file_details_select_by_member"
  on public.source_file_details for select
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_access(sm.project_id)
    )
  );

create policy "source_file_details_write_by_editor"
  on public.source_file_details for insert
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_file_details_update_by_editor"
  on public.source_file_details for update
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_file_details_delete_by_editor"
  on public.source_file_details for delete
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_meeting_details_select_by_member"
  on public.source_meeting_details for select
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_access(sm.project_id)
    )
  );

create policy "source_meeting_details_write_by_editor"
  on public.source_meeting_details for insert
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_meeting_details_update_by_editor"
  on public.source_meeting_details for update
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_meeting_details_delete_by_editor"
  on public.source_meeting_details for delete
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_email_details_select_by_member"
  on public.source_email_details for select
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_access(sm.project_id)
    )
  );

create policy "source_email_details_write_by_editor"
  on public.source_email_details for insert
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_email_details_update_by_editor"
  on public.source_email_details for update
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );

create policy "source_email_details_delete_by_editor"
  on public.source_email_details for delete
  using (
    exists (
      select 1 from public.source_materials sm
      where sm.id = source_material_id
        and public.user_has_project_write_access(sm.project_id)
    )
  );
