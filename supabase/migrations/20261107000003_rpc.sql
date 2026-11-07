-- =============================================================================
-- TIM REPUESTOS · 0003 · RPC (funciones expuestas)
-- Todas SECURITY DEFINER con search_path vacío y autorización explícita.
-- =============================================================================

-- Errores: 42501 = no autorizado (PostgREST → 403); PT429 = rate limit (→ 429)

create or replace function private.assert_catalog_access()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.can_view_catalog() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end $$;

create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end $$;

create or replace function private.prices_visible()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.prices_visible_to_customers from public.settings s where s.id = 1), false)
         or public.is_admin()
$$;

create or replace function private.escape_like(t text)
returns text language sql immutable set search_path = ''
as $$ select replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') $$;

-- ---------------------------------------------------------------------------
-- Catálogo (clientes autorizados)
-- ---------------------------------------------------------------------------
create or replace function public.catalog_search(
  p_query     text    default null,
  p_category  text    default null,
  p_brand     text    default null,
  p_sort      text    default 'relevance',
  p_page      integer default 1,
  p_page_size integer default 24
)
returns table (
  id             uuid,
  sku            text,
  name           text,
  brand_name     text,
  brand_slug     text,
  category_name  text,
  category_slug  text,
  sale_price_ars numeric,
  stock_status   public.stock_status,
  image_path     text,
  total_count    bigint
)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_q       text := left(public.normalize_search(p_query), 120);
  v_qsku    text := public.normalize_sku(left(coalesce(p_query, ''), 120));
  v_tokens  text[];
  v_size    integer := least(greatest(coalesce(p_page_size, 24), 1), 48);
  v_page    integer := least(greatest(coalesce(p_page, 1), 1), 1000);
  v_prices  boolean;
  v_sort    text := coalesce(p_sort, 'relevance');
begin
  perform private.assert_catalog_access();
  if not private.hit_rate_limit('search:' || auth.uid()::text, 240, 60) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;

  v_prices := private.prices_visible();
  if v_sort not in ('relevance', 'name_asc', 'name_desc', 'price_asc', 'price_desc') then v_sort := 'relevance'; end if;
  if not v_prices and v_sort in ('price_asc', 'price_desc') then v_sort := 'relevance'; end if;
  if v_q = '' and v_sort = 'relevance' then v_sort := 'name_asc'; end if;

  select coalesce(array_agg(private.escape_like(t)), '{}')
    into v_tokens
    from unnest(string_to_array(v_q, ' ')) as t
   where t <> '';

  return query
  with base as (
    select p.id, p.sku, p.name, p.sku_norm, p.search_text,
           b.name as b_name, b.slug as b_slug, c.name as c_name, c.slug as c_slug,
           p.sale_price_ars as price, p.stock_status as stock, p.image_path as img
      from public.products p
      left join public.brands b     on b.id = p.brand_id
      left join public.categories c on c.id = p.category_id
     where p.active
       and (b.id is null or b.active)
       and (c.id is null or c.active)
       and (p_category is null or p_category = '' or c.slug = p_category)
       and (p_brand    is null or p_brand    = '' or b.slug = p_brand)
       and (
         cardinality(v_tokens) = 0
         or (v_qsku <> '' and p.sku_norm = v_qsku)
         or not exists (
              select 1 from unnest(v_tokens) tok
               where p.search_text not like '%' || tok || '%'
            )
       )
  )
  select base.id, base.sku, base.name, base.b_name, base.b_slug, base.c_name, base.c_slug,
         case when v_prices then base.price end,
         base.stock, base.img,
         count(*) over ()
    from base
   order by
     case when v_sort = 'relevance' then
       case when v_qsku <> '' and base.sku_norm = v_qsku then 0
            when v_qsku <> '' and base.sku_norm like v_qsku || '%' then 1
            when public.normalize_search(base.name) like v_q || '%' then 2
            else 3 end
     end,
     case when v_sort = 'relevance' then extensions.similarity(base.search_text, v_q) end desc,
     case when v_sort = 'price_asc'  then base.price end asc  nulls last,
     case when v_sort = 'price_desc' then base.price end desc nulls last,
     case when v_sort = 'name_desc'  then base.name end desc,
     base.name asc,
     base.sku asc
   limit v_size offset (v_page - 1) * v_size;
end $$;

create or replace function public.catalog_product(p_sku text)
returns table (
  id               uuid,
  sku              text,
  name             text,
  description      text,
  brand_name       text,
  brand_slug       text,
  category_name    text,
  category_slug    text,
  sale_price_ars   numeric,
  stock_status     public.stock_status,
  image_path       text,
  compatibility    text,
  specs            jsonb,
  in_list_quantity integer
)
language plpgsql volatile security definer set search_path = ''
as $$
declare v_prices boolean;
begin
  perform private.assert_catalog_access();
  if not private.hit_rate_limit('product:' || auth.uid()::text, 240, 60) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  v_prices := private.prices_visible();

  return query
  select p.id, p.sku, p.name, p.description,
         b.name, b.slug, c.name, c.slug,
         case when v_prices then p.sale_price_ars end,
         p.stock_status, p.image_path,
         -- compatibilidad sólo si fue verificada por el comercio
         case when p.compatibility_verified_at is not null then p.compatibility end,
         -- especificaciones curadas (attributes.specs); el resto de attributes es interno
         case when jsonb_typeof(p.attributes -> 'specs') = 'object' then p.attributes -> 'specs' else '{}'::jsonb end,
         (select li.quantity from public.inquiry_list_items li
           where li.profile_id = auth.uid() and li.product_id = p.id)
    from public.products p
    left join public.brands b     on b.id = p.brand_id
    left join public.categories c on c.id = p.category_id
   where p.active
     and (b.id is null or b.active)
     and (c.id is null or c.active)
     and p.sku = upper(btrim(p_sku))
   limit 1;
end $$;

create or replace function public.catalog_facets()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.assert_catalog_access();
  return jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'count', x.n) order by x.sort_order, x.name)
        from (select c.slug, c.name, c.sort_order, count(p.id) as n
                from public.categories c
                join public.products p on p.category_id = c.id and p.active
               where c.active group by c.id) x), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'count', x.n) order by x.name)
        from (select b.slug, b.name, count(p.id) as n
                from public.brands b
                join public.products p on p.brand_id = b.id and p.active
               where b.active group by b.id) x), '[]'::jsonb),
    'prices_visible', private.prices_visible()
  );
end $$;

-- ---------------------------------------------------------------------------
-- Lista de consulta
-- ---------------------------------------------------------------------------
create or replace function public.inquiry_list_get()
returns table (product_id uuid, sku text, name text, brand_name text, image_path text, quantity integer, sale_price_ars numeric, available boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare v_prices boolean;
begin
  perform private.assert_catalog_access();
  v_prices := private.prices_visible();
  return query
  select p.id, p.sku, p.name, b.name, p.image_path, li.quantity,
         case when v_prices then p.sale_price_ars end,
         p.active
    from public.inquiry_list_items li
    join public.products p on p.id = li.product_id
    left join public.brands b on b.id = p.brand_id
   where li.profile_id = auth.uid()
   order by li.added_at;
end $$;

-- p_quantity = 0 quita el producto. p_mode 'set' fija la cantidad, 'add' suma.
create or replace function public.inquiry_list_set(p_product_id uuid, p_quantity integer, p_mode text default 'set')
returns integer language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_qty integer;
begin
  perform private.assert_catalog_access();
  if not private.hit_rate_limit('list:' || v_uid::text, 240, 60) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 999 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;

  if p_quantity = 0 then
    delete from public.inquiry_list_items where profile_id = v_uid and product_id = p_product_id;
    return 0;
  end if;

  if not exists (select 1 from public.products p where p.id = p_product_id and p.active) then
    raise exception 'product_not_found' using errcode = '22023';
  end if;
  if (select count(*) from public.inquiry_list_items where profile_id = v_uid) >= 100
     and not exists (select 1 from public.inquiry_list_items where profile_id = v_uid and product_id = p_product_id) then
    raise exception 'list_full' using errcode = '22023';
  end if;

  insert into public.inquiry_list_items as li (profile_id, product_id, quantity)
  values (v_uid, p_product_id, p_quantity)
  on conflict (profile_id, product_id) do update
     set quantity = least(999, case when p_mode = 'add' then li.quantity + excluded.quantity else excluded.quantity end)
  returning li.quantity into v_qty;
  return v_qty;
end $$;

create or replace function public.inquiry_list_clear()
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authorized' using errcode = '42501'; end if;
  delete from public.inquiry_list_items where profile_id = auth.uid();
end $$;

-- Registra la consulta a partir de la lista guardada en el servidor (los
-- nombres/SKU salen de la base, no del navegador). Devuelve los ítems para
-- armar el mensaje de WhatsApp. Vacía la lista.
create or replace function public.inquiry_create(p_notes text default null)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_id     uuid;
  v_number bigint;
  v_count  integer;
begin
  perform private.assert_catalog_access();
  if not private.hit_rate_limit('inquiry:' || v_uid::text, 10, 3600) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;

  insert into public.product_inquiries (profile_id, notes)
  values (v_uid, nullif(left(btrim(regexp_replace(coalesce(p_notes, ''), '[[:cntrl:]]', ' ', 'g')), 1000), ''))
  returning product_inquiries.id, product_inquiries.number into v_id, v_number;

  insert into public.product_inquiry_items (inquiry_id, product_id, sku_snapshot, name_snapshot, brand_snapshot, quantity)
  select v_id, p.id, p.sku, p.name, b.name, li.quantity
    from public.inquiry_list_items li
    join public.products p on p.id = li.product_id and p.active
    left join public.brands b on b.id = p.brand_id
   where li.profile_id = v_uid
   order by li.added_at;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'empty_list' using errcode = '22023';
  end if;

  delete from public.inquiry_list_items where profile_id = v_uid;

  return jsonb_build_object(
    'id', v_id,
    'number', v_number,
    'items', (select jsonb_agg(jsonb_build_object('sku', i.sku_snapshot, 'name', i.name_snapshot,
                                                  'brand', i.brand_snapshot, 'quantity', i.quantity)
                               order by i.sku_snapshot)
                from public.product_inquiry_items i where i.inquiry_id = v_id)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_profile_status(p_profile_id uuid, p_status public.profile_status)
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_profile_id = auth.uid() then
    raise exception 'cannot_change_own_status' using errcode = '22023';
  end if;
  update public.profiles
     set status = p_status,
         approved_at = case when p_status = 'active' then now() else approved_at end,
         approved_by = case when p_status = 'active' then auth.uid() else approved_by end
   where id = p_profile_id and role <> 'admin';
  if not found then
    raise exception 'profile_not_found_or_admin' using errcode = '22023';
  end if;
end $$;

create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  return jsonb_build_object(
    'products_active',   (select count(*) from public.products where active),
    'products_inactive', (select count(*) from public.products where not active),
    'products_no_image', (select count(*) from public.products where active and image_path is null),
    'products_no_price', (select count(*) from public.products where active and sale_price_ars is null),
    'categories',        (select count(*) from public.categories),
    'brands',            (select count(*) from public.brands),
    'users_pending',     (select count(*) from public.profiles where status = 'pending' and role <> 'admin'),
    'users_total',       (select count(*) from public.profiles),
    'inquiries_new',     (select count(*) from public.product_inquiries where status = 'new'),
    'last_import',       (select to_jsonb(j) - 'errors_json' from public.import_jobs j order by created_at desc limit 1)
  );
end $$;

-- Costos (sólo admin; viven en private.product_costs)
create or replace function public.admin_get_product_cost(p_product_id uuid)
returns numeric language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  return (select cost_price_ars from private.product_costs where product_id = p_product_id);
end $$;

create or replace function public.admin_set_product_cost(p_product_id uuid, p_cost numeric)
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_cost is null then
    delete from private.product_costs where product_id = p_product_id;
  elsif p_cost < 0 then
    raise exception 'invalid_cost' using errcode = '22023';
  else
    insert into private.product_costs (product_id, cost_price_ars, updated_by)
    values (p_product_id, round(p_cost, 2), auth.uid())
    on conflict (product_id) do update
      set cost_price_ars = excluded.cost_price_ars, updated_at = now(), updated_by = excluded.updated_by;
  end if;
end $$;

-- Importación ---------------------------------------------------------------
create or replace function public.admin_import_start(
  p_kind text, p_filename text, p_total_rows integer, p_error_count integer,
  p_skipped_count integer, p_errors jsonb
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  insert into public.import_jobs (kind, filename, user_id, total_rows, error_count, skipped_count, errors_json)
  values (p_kind, left(p_filename, 255), auth.uid(), coalesce(p_total_rows, 0), coalesce(p_error_count, 0),
          coalesce(p_skipped_count, 0),
          case when jsonb_typeof(p_errors) = 'array' then p_errors else '[]'::jsonb end)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_import_finish(p_job_id uuid, p_status text default 'completed')
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare v_job jsonb;
begin
  perform private.assert_admin();
  update public.import_jobs
     set status = case when p_status in ('completed', 'failed') then p_status else 'completed' end,
         finished_at = now()
   where id = p_job_id
  returning to_jsonb(import_jobs) - 'errors_json' into v_job;
  return v_job;
end $$;

-- UPSERT por SKU. p_fields = campos mapeados en el archivo: los no mapeados no
-- se tocan en productos existentes. Nunca borra productos omitidos.
-- Filas: [{sku, name, brand, category, category_source, sale_price_ars,
--          description, original_image_path, active, attributes}]
create or replace function public.admin_import_products(p_job_id uuid, p_fields text[], p_rows jsonb)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_created integer := 0;
  v_updated integer := 0;
  v_total   integer;
  f_price boolean := 'sale_price_ars'      = any(p_fields);
  f_desc  boolean := 'description'         = any(p_fields);
  f_img   boolean := 'original_image_path' = any(p_fields);
  f_act   boolean := 'active'              = any(p_fields);
  f_brand boolean := 'brand'               = any(p_fields);
  f_cat   boolean := 'category'            = any(p_fields);
begin
  perform private.assert_admin();
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then
    raise exception 'invalid_rows' using errcode = '22023';
  end if;

  create temp table _imp on commit drop as
  select upper(btrim(r.sku)) as sku, btrim(r.name) as name,
         nullif(btrim(r.brand), '') as brand, nullif(btrim(r.category), '') as category,
         nullif(btrim(r.category_source), '') as category_source,
         r.sale_price_ars, nullif(btrim(r.description), '') as description,
         nullif(btrim(r.original_image_path), '') as original_image_path,
         coalesce(r.active, true) as active,
         coalesce(r.attributes, '{}'::jsonb) as attributes
    from jsonb_to_recordset(p_rows) as r(sku text, name text, brand text, category text, category_source text,
                                         sale_price_ars numeric, description text, original_image_path text,
                                         active boolean, attributes jsonb)
   where coalesce(btrim(r.sku), '') <> '' and coalesce(btrim(r.name), '') <> '';
  v_total := (select count(*) from pg_temp._imp);

  if (select count(*) from (select sku from pg_temp._imp group by sku having count(*) > 1) d) > 0 then
    raise exception 'duplicate_sku_in_batch' using errcode = '22023';
  end if;

  insert into public.brands (name, slug)
  select distinct on (public.slugify(brand)) brand, public.slugify(brand)
    from pg_temp._imp where f_brand and brand is not null and public.slugify(brand) <> ''
  on conflict (slug) do nothing;

  insert into public.categories (name, slug, source_name)
  select distinct on (public.slugify(category)) category, public.slugify(category), category_source
    from pg_temp._imp where f_cat and category is not null and public.slugify(category) <> ''
  on conflict (slug) do nothing;

  with up as (
    insert into public.products as p
      (sku, name, brand_id, category_id, sale_price_ars, description, original_image_path, active, attributes, updated_by)
    select i.sku, i.name, b.id, c.id, round(i.sale_price_ars, 2), i.description, i.original_image_path, i.active,
           i.attributes, auth.uid()
      from pg_temp._imp i
      left join public.brands b     on f_brand and b.slug = public.slugify(i.brand)
      left join public.categories c on f_cat   and c.slug = public.slugify(i.category)
    on conflict (sku) do update set
      name                = excluded.name,
      brand_id            = case when f_brand then excluded.brand_id else p.brand_id end,
      category_id         = case when f_cat   then excluded.category_id else p.category_id end,
      sale_price_ars      = case when f_price then excluded.sale_price_ars else p.sale_price_ars end,
      description         = case when f_desc  then excluded.description else p.description end,
      original_image_path = case when f_img   then excluded.original_image_path else p.original_image_path end,
      active              = case when f_act   then excluded.active else p.active end,
      attributes          = p.attributes || excluded.attributes,
      updated_by          = excluded.updated_by
    where (p.name, p.brand_id, p.category_id, p.sale_price_ars, p.description, p.original_image_path, p.active, p.attributes)
          is distinct from
          (excluded.name,
           case when f_brand then excluded.brand_id else p.brand_id end,
           case when f_cat   then excluded.category_id else p.category_id end,
           case when f_price then excluded.sale_price_ars else p.sale_price_ars end,
           case when f_desc  then excluded.description else p.description end,
           case when f_img   then excluded.original_image_path else p.original_image_path end,
           case when f_act   then excluded.active else p.active end,
           p.attributes || excluded.attributes)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted)
    into v_created, v_updated
    from up;

  if p_job_id is not null then
    update public.import_jobs
       set created_count   = created_count + v_created,
           updated_count   = updated_count + v_updated,
           unchanged_count = unchanged_count + (v_total - v_created - v_updated)
     where id = p_job_id;
  end if;

  return jsonb_build_object('created', v_created, 'updated', v_updated,
                            'unchanged', v_total - v_created - v_updated, 'received', v_total);
end $$;

-- Importación de costos: sólo actualiza SKUs existentes.
-- Filas: [{sku, cost_price_ars}]
create or replace function public.admin_import_costs(p_job_id uuid, p_rows jsonb)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_updated   integer;
  v_not_found jsonb;
  v_total     integer;
begin
  perform private.assert_admin();
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'invalid_rows' using errcode = '22023';
  end if;

  create temp table _cost on commit drop as
  select upper(btrim(r.sku)) as sku, round(r.cost_price_ars, 2) as cost
    from jsonb_to_recordset(p_rows) as r(sku text, cost_price_ars numeric)
   where coalesce(btrim(r.sku), '') <> '' and r.cost_price_ars is not null and r.cost_price_ars >= 0;
  v_total := (select count(*) from pg_temp._cost);

  with up as (
    insert into private.product_costs as pc (product_id, cost_price_ars, updated_by)
    select p.id, c.cost, auth.uid() from pg_temp._cost c join public.products p on p.sku = c.sku
    on conflict (product_id) do update
       set cost_price_ars = excluded.cost_price_ars, updated_at = now(), updated_by = excluded.updated_by
     where pc.cost_price_ars is distinct from excluded.cost_price_ars
    returning 1
  ) select count(*) into v_updated from up;

  select coalesce(jsonb_agg(c.sku), '[]'::jsonb) into v_not_found
    from pg_temp._cost c where not exists (select 1 from public.products p where p.sku = c.sku);

  if p_job_id is not null then
    update public.import_jobs
       set updated_count   = updated_count + v_updated,
           unchanged_count = unchanged_count + (v_total - v_updated - jsonb_array_length(v_not_found)),
           error_count     = error_count + jsonb_array_length(v_not_found)
     where id = p_job_id;
  end if;

  return jsonb_build_object('updated', v_updated, 'not_found', v_not_found, 'received', v_total);
end $$;

-- Productos activos de las marcas importadas que NO vinieron en el archivo
-- (para ofrecer desactivarlos en lote, siempre con confirmación).
create or replace function public.admin_products_missing_from(p_skus text[], p_brand_slugs text[])
returns table (id uuid, sku text, name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  return query
  select p.id, p.sku, p.name
    from public.products p
    join public.brands b on b.id = p.brand_id
   where p.active
     and b.slug = any(p_brand_slugs)
     and not (p.sku = any(select upper(btrim(s)) from unnest(p_skus) s))
   order by p.sku
   limit 5000;
end $$;

-- Mapa para asociar fotos: basename de la ruta original y SKU → producto
create or replace function public.admin_image_match_index()
returns table (id uuid, sku text, sku_norm text, original_basename text, has_image boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.assert_admin();
  return query
  select p.id, p.sku, p.sku_norm,
         upper(regexp_replace(coalesce(p.original_image_path, ''), '^.*[\\/]', '')),
         p.image_path is not null
    from public.products p;
end $$;

-- ---------------------------------------------------------------------------
-- Grants de ejecución
-- ---------------------------------------------------------------------------
revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant execute on function public.is_admin()          to authenticated;
grant execute on function public.can_view_catalog()  to authenticated;
grant execute on function public.my_access()         to anon, authenticated;
grant execute on function public.normalize_search(text), public.normalize_sku(text),
                          public.slugify(text), public.f_unaccent(text)
  to authenticated;

grant execute on function public.catalog_search(text, text, text, text, integer, integer) to authenticated;
grant execute on function public.catalog_product(text)                                    to authenticated;
grant execute on function public.catalog_facets()                                         to authenticated;
grant execute on function public.inquiry_list_get()                                       to authenticated;
grant execute on function public.inquiry_list_set(uuid, integer, text)                    to authenticated;
grant execute on function public.inquiry_list_clear()                                     to authenticated;
grant execute on function public.inquiry_create(text)                                     to authenticated;

grant execute on function public.admin_set_profile_status(uuid, public.profile_status)   to authenticated;
grant execute on function public.admin_dashboard_stats()                                  to authenticated;
grant execute on function public.admin_get_product_cost(uuid)                             to authenticated;
grant execute on function public.admin_set_product_cost(uuid, numeric)                    to authenticated;
grant execute on function public.admin_import_start(text, text, integer, integer, integer, jsonb) to authenticated;
grant execute on function public.admin_import_finish(uuid, text)                          to authenticated;
grant execute on function public.admin_import_products(uuid, text[], jsonb)               to authenticated;
grant execute on function public.admin_import_costs(uuid, jsonb)                          to authenticated;
grant execute on function public.admin_products_missing_from(text[], text[])             to authenticated;
grant execute on function public.admin_image_match_index()                                to authenticated;

grant execute on function public.rate_limit_check(text, integer, integer) to service_role;
grant execute on function public.admin_promote_by_service(text)           to service_role;
