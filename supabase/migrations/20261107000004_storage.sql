-- =============================================================================
-- TIM REPUESTOS · 0004 · Storage
--  * product-images: PRIVADO. Lectura sólo para usuarios con acceso al catálogo
--    (la app genera URLs firmadas de corta duración). Escritura sólo admin.
--  * site-assets: PÚBLICO (fotos del local para la home). Escritura sólo admin.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('site-assets',    'site-assets',    true,  5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_read_catalog" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.can_view_catalog());

create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "site_assets_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_admin());

create policy "site_assets_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());

create policy "site_assets_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets' and public.is_admin());

-- Listado del bucket público sólo admin (las imágenes se sirven por URL pública)
create policy "site_assets_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-assets' and public.is_admin());
