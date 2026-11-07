-- =============================================================================
-- TIM REPUESTOS · 0002 · Seguridad: funciones de acceso, GRANTs y RLS
--
-- Modelo:
--  * anon (visitante): sólo lee settings (datos públicos del local) y rubros
--    activos marcados como públicos. Nada de productos, precios ni SKU.
--  * authenticated (cliente): NO lee la tabla products directamente. Accede al
--    catálogo sólo vía RPC SECURITY DEFINER (0003) que valida can_view_catalog()
--    y omite el precio cuando prices_visible_to_customers = false.
--  * admin: rol en profiles.role, asignado sólo por SQL/servidor (ver
--    private.set_admin). Lee/escribe catálogo vía RLS con is_admin().
--  * Costos: private.product_costs (esquema no expuesto) + RPC admin.
-- Supabase otorga por defecto ALL a anon/authenticated sobre public: acá se
-- revoca todo explícitamente y se vuelve a otorgar lo mínimo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funciones de acceso
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
  )
$$;

create or replace function public.can_view_catalog()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.settings s on s.id = 1
    where p.id = auth.uid()
      and u.email_confirmed_at is not null
      and (
        (p.role = 'admin' and p.status = 'active')
        or (
          p.role in ('customer', 'wholesale')
          and (p.status = 'active' or (p.status = 'pending' and not s.requires_approval))
        )
      )
  )
$$;

-- Estado de acceso del usuario actual (para mostrar "cuenta pendiente", etc.)
create or replace function public.my_access()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when auth.uid() is null then jsonb_build_object('authenticated', false)
  else (
    select jsonb_build_object(
      'authenticated', true,
      'full_name', p.full_name,
      'email', p.email,
      'phone', p.phone,
      'role', p.role,
      'status', p.status,
      'email_confirmed', u.email_confirmed_at is not null,
      'requires_approval', s.requires_approval,
      'is_admin', public.is_admin(),
      'can_view_catalog', public.can_view_catalog()
    )
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.settings s on s.id = 1
    where p.id = auth.uid()
  ) end
$$;

-- Rate limit de ventana fija. Devuelve true si la operación está permitida.
create or replace function private.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- limpieza oportunista de ventanas viejas
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end $$;

-- Rate limit para el servidor (login, registro, recuperación). Sólo service_role:
-- si anon pudiera llamarlo, podría bloquear la cuenta de otra persona.
create or replace function public.rate_limit_check(p_key text, p_max integer, p_window_seconds integer)
returns boolean language sql security definer set search_path = ''
as $$ select private.hit_rate_limit(left(p_key, 200), greatest(p_max, 1), greatest(p_window_seconds, 1)) $$;

-- Promover administrador: SOLO desde el SQL Editor de Supabase (rol postgres)
-- o con service_role desde scripts/promote-admin.mjs. Nunca desde el registro.
create or replace function private.set_admin(p_email text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  update public.profiles
     set role = 'admin', status = 'active', approved_at = now()
   where lower(email) = lower(btrim(p_email))
  returning id into v_id;
  if v_id is null then
    raise exception 'No existe un perfil con email %', p_email;
  end if;
  return 'OK: ' || p_email || ' ahora es admin';
end $$;

create or replace function public.admin_promote_by_service(p_email text)
returns text language sql security definer set search_path = ''
as $$ select private.set_admin(p_email) $$;

-- ---------------------------------------------------------------------------
-- Revocar todo lo que Supabase otorga por defecto
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public  from anon, authenticated;
revoke all on all sequences in schema public  from anon, authenticated;
revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all tables    in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on schema private from anon, authenticated;

-- Funciones de acceso usadas dentro de policies (se evalúan como el usuario)
grant execute on function public.is_admin()          to authenticated;
grant execute on function public.can_view_catalog()  to authenticated;
grant execute on function public.my_access()         to anon, authenticated;
-- Normalizadores puros (sin acceso a datos)
grant execute on function public.normalize_search(text), public.normalize_sku(text),
                          public.slugify(text), public.f_unaccent(text)
  to authenticated;
-- Sólo backend
grant execute on function public.rate_limit_check(text, integer, integer) to service_role;
grant execute on function public.admin_promote_by_service(text)           to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.settings              enable row level security;
alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.brands                enable row level security;
alter table public.products              enable row level security;
alter table public.inquiry_list_items    enable row level security;
alter table public.product_inquiries     enable row level security;
alter table public.product_inquiry_items enable row level security;
alter table public.import_jobs           enable row level security;
alter table private.product_costs        enable row level security;
alter table private.rate_limits          enable row level security;
-- (private.*: sin policies ni grants = inaccesible para anon/authenticated)

-- settings: lectura pública (son datos de contacto del local); escritura admin
grant select on public.settings to anon, authenticated;
grant update (store_name, address, phone_display, whatsapp_number, whatsapp_confirmed, instagram_url,
              maps_url, email_public, business_hours, pickup_confirmed, requires_approval,
              prices_visible_to_customers, hero_image_url, about_image_url, privacy_policy_version, updated_by)
  on public.settings to authenticated;
create policy settings_read  on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: cada uno ve el suyo; admin ve todos. El usuario sólo puede editar
-- nombre y teléfono (GRANT por columna: role/status no son editables).
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- categories: los visitantes ven sólo nombres de rubros activos y públicos.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
create policy categories_public_read on public.categories for select to anon, authenticated
  using (active and public_visible);
create policy categories_catalog_read on public.categories for select to authenticated
  using (active and public.can_view_catalog());
create policy categories_admin_all on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- brands: sólo usuarios con acceso al catálogo
grant select on public.brands to authenticated;
grant insert, update, delete on public.brands to authenticated;
create policy brands_catalog_read on public.brands for select to authenticated
  using (active and public.can_view_catalog());
create policy brands_admin_all on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products: SOLO admin por tabla. Clientes => RPC catalog_* (sin precio si está oculto).
grant select, insert, update, delete on public.products to authenticated;
create policy products_admin_all on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lista de consulta: cada usuario la suya (mutaciones vía RPC en 0003)
grant select on public.inquiry_list_items to authenticated;
create policy inquiry_list_own on public.inquiry_list_items for select to authenticated
  using (profile_id = auth.uid());

-- consultas: el cliente lee las propias; admin todas y cambia estado/notas
grant select on public.product_inquiries to authenticated;
grant update (status, admin_notes) on public.product_inquiries to authenticated;
create policy inquiries_read on public.product_inquiries for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy inquiries_admin_update on public.product_inquiries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.product_inquiry_items to authenticated;
create policy inquiry_items_read on public.product_inquiry_items for select to authenticated
  using (exists (
    select 1 from public.product_inquiries i
    where i.id = inquiry_id and (i.profile_id = auth.uid() or public.is_admin())
  ));

-- import_jobs: sólo admin (lectura). Escritura vía RPC admin.
grant select on public.import_jobs to authenticated;
create policy import_jobs_admin_read on public.import_jobs for select to authenticated
  using (public.is_admin());

-- Futuras tablas/funciones en public: no heredan permisos amplios por defecto.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
