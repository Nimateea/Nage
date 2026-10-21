-- Migration 0002: Storage buckets and policies

-- ── project-assets: uploaded + AI-generated images ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,                          -- private
  8388608,                        -- 8 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated users to manage their own folder: {user_id}/{project_id}/...
create policy "project-assets: owner select"
  on storage.objects for select
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project-assets: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project-assets: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── exports: PNG / SVG exports ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800,                       -- 50 MB
  array['image/png', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "exports: owner select"
  on storage.objects for select
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "exports: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "exports: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
