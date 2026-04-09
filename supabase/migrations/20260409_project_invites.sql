create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint project_invites_email_normalized check (email = lower(trim(email)))
);

create unique index if not exists project_invites_pending_email_key
on public.project_invites(project_id, email)
where status = 'pending';

create index if not exists project_invites_email_idx
on public.project_invites(email);

alter table public.project_invites enable row level security;

create policy "project_invites_owner_select"
on public.project_invites
for select
using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = public.project_invites.project_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'owner'
  )
);
