create extension if not exists vector;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  agent_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table if not exists public.project_file_versions (
  id uuid primary key default gen_random_uuid(),
  project_file_id uuid not null references public.project_files(id) on delete cascade,
  content text not null,
  version integer not null,
  edited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_file_id, version)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb,
  citations jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.source_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('document', 'email', 'meeting', 'note')),
  title text not null,
  raw_storage_path text,
  parsed_content text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null check (status in ('processing', 'ready', 'failed')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_material_id uuid not null references public.source_materials(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  chunk_index integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  summary text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace_id on public.projects(workspace_id);
create index if not exists idx_project_files_project_id_path on public.project_files(project_id, path);
create index if not exists idx_messages_conversation_created_at on public.messages(conversation_id, created_at);
create index if not exists idx_activity_events_project_created_at on public.activity_events(project_id, created_at);
create index if not exists idx_source_materials_project_created_at on public.source_materials(project_id, created_at);
create index if not exists idx_source_chunks_source_material_id on public.source_chunks(source_material_id);
create index if not exists idx_source_chunks_embedding on public.source_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_workspaces before update on public.workspaces for each row execute function public.set_updated_at();
create trigger set_updated_at_projects before update on public.projects for each row execute function public.set_updated_at();
create trigger set_updated_at_project_files before update on public.project_files for each row execute function public.set_updated_at();
create trigger set_updated_at_source_materials before update on public.source_materials for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.user_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

create or replace function public.match_source_chunks(
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table(
  chunk_id uuid,
  source_material_id uuid,
  content text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    sc.id as chunk_id,
    sc.source_material_id,
    sc.content,
    1 - (sc.embedding <=> p_query_embedding) as similarity
  from public.source_chunks sc
  join public.source_materials sm on sm.id = sc.source_material_id
  where sm.project_id = p_project_id
  order by sc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_files enable row level security;
alter table public.project_file_versions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.source_materials enable row level security;
alter table public.source_chunks enable row level security;
alter table public.activity_events enable row level security;

create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid());

create policy "workspace_members_select_own" on public.workspace_members for select using (user_id = auth.uid());

create policy "workspaces_access_by_membership" on public.workspaces
for select using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = id and wm.user_id = auth.uid()
  )
);

create policy "projects_access_by_membership" on public.projects
for select using (public.user_has_project_access(id));

create policy "project_members_access_by_membership" on public.project_members
for select using (public.user_has_project_access(project_id));

create policy "project_files_access_by_membership" on public.project_files
for select using (public.user_has_project_access(project_id));

create policy "project_files_edit_by_member" on public.project_files
for all using (public.user_has_project_access(project_id))
with check (public.user_has_project_access(project_id));

create policy "project_file_versions_access_by_membership" on public.project_file_versions
for select using (
  exists (
    select 1
    from public.project_files pf
    where pf.id = project_file_id and public.user_has_project_access(pf.project_id)
  )
);

create policy "conversations_access_by_membership" on public.conversations
for all using (public.user_has_project_access(project_id))
with check (public.user_has_project_access(project_id));

create policy "messages_access_by_membership" on public.messages
for all using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id and public.user_has_project_access(c.project_id)
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id and public.user_has_project_access(c.project_id)
  )
);

create policy "source_materials_access_by_membership" on public.source_materials
for all using (public.user_has_project_access(project_id))
with check (public.user_has_project_access(project_id));

create policy "source_chunks_access_by_membership" on public.source_chunks
for select using (
  exists (
    select 1
    from public.source_materials sm
    where sm.id = source_material_id and public.user_has_project_access(sm.project_id)
  )
);

create policy "activity_events_access_by_membership" on public.activity_events
for select using (public.user_has_project_access(project_id));
