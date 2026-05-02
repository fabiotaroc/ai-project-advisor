-- =============================================================
-- Account profile: split name into first_name + last_name and
-- add a public avatars bucket so users can upload profile pics.
-- =============================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Best-effort backfill from the existing single `name` column.
update public.profiles
  set first_name = coalesce(first_name, nullif(split_part(name, ' ', 1), '')),
      last_name  = coalesce(
        last_name,
        case
          when position(' ' in coalesce(name, '')) > 0
            then nullif(trim(substring(name from position(' ' in name) + 1)), '')
          else null
        end
      )
  where name is not null and (first_name is null or last_name is null);

-- Avatars storage bucket (publicly readable, auth-gated writes).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "Authenticated users can update avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can delete avatars" on storage.objects;
create policy "Authenticated users can delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');

-- Keep the auto-provision trigger backward compatible: include
-- first_name/last_name when a new auth user is inserted, falling
-- back to splitting the existing `name` payload.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(
      new.raw_user_meta_data->>'first_name',
      nullif(split_part(coalesce(new.raw_user_meta_data->>'name', ''), ' ', 1), '')
    ),
    coalesce(
      new.raw_user_meta_data->>'last_name',
      case
        when position(' ' in coalesce(new.raw_user_meta_data->>'name', '')) > 0
          then nullif(
            trim(substring(new.raw_user_meta_data->>'name'
              from position(' ' in new.raw_user_meta_data->>'name') + 1)),
            ''
          )
        else null
      end
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  insert into public.workspaces (owner_id, name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '')
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;
