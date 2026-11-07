-- =============================================================================
-- TIM REPUESTOS · 0001 · Esquema principal
-- Tablas, tipos, normalización de texto, triggers e índices.
-- La seguridad (grants + RLS) está en 0002; RPCs en 0003; Storage en 0004.
-- =============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Esquema interno: NO expuesto por la API de Supabase (PostgREST sólo expone
-- "public" y "graphql_public"). Acá viven costos y datos operativos internos.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role      as enum ('customer', 'admin', 'wholesale');
create type public.profile_status as enum ('pending', 'active', 'blocked');
create type public.stock_status   as enum ('unknown', 'available', 'on_request', 'out_of_stock');
create type public.inquiry_status as enum ('new', 'contacted', 'closed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Normalización de texto (insensible a mayúsculas y acentos)
-- ---------------------------------------------------------------------------
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create or replace function public.normalize_search(t text)
returns text language sql immutable parallel safe
set search_path = ''
as $$ select lower(public.f_unaccent(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'))) $$;

create or replace function public.normalize_sku(t text)
returns text language sql immutable parallel safe
set search_path = ''
as $$ select upper(regexp_replace(public.f_unaccent(coalesce(t, '')), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public.slugify(t text)
returns text language sql immutable parallel safe
set search_path = ''
as $$ select btrim(regexp_replace(lower(public.f_unaccent(coalesce(t, ''))), '[^a-z0-9]+', '-', 'g'), '-') $$;

-- ---------------------------------------------------------------------------
-- Configuración del comercio (fila única id = 1)
-- Valores por defecto: sólo datos provistos por el comercio. Los que el dueño
-- todavía no confirmó quedan en NULL o con su flag *_confirmed = false.
-- ---------------------------------------------------------------------------
create table public.settings (
  id                          smallint primary key default 1 check (id = 1),
  store_name                  text not null default 'TIM REPUESTOS',
  address                     text not null default 'Cjal. Larroca 1197, Garín, Buenos Aires, Argentina',
  phone_display               text default '+54 9 11 3003-7581',
  whatsapp_number             text not null default '5491130037581'
                              check (whatsapp_number ~ '^[0-9]{8,15}$'),
  whatsapp_confirmed          boolean not null default false,
  instagram_url               text default 'https://www.instagram.com/timrepuestosgarin/',
  maps_url                    text default 'https://www.google.com/maps/search/?api=1&query=Cjal.+Larroca+1197,+Gar%C3%ADn,+Buenos+Aires',
  email_public                text,
  business_hours              text,              -- NULL = horarios no confirmados
  pickup_confirmed            boolean not null default false,   -- "Retiro en Garín"
  requires_approval           boolean not null default true,
  prices_visible_to_customers boolean not null default false,
  hero_image_url              text,
  about_image_url             text,
  privacy_policy_version      text not null default '2026-11-borrador',
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users). Sin contraseñas: las gestiona Supabase Auth.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null check (char_length(full_name) between 1 and 120),
  email               text not null,
  phone               text check (phone is null or phone ~ '^[0-9 +()-]{6,25}$'),
  role                public.user_role not null default 'customer',
  status              public.profile_status not null default 'pending',
  privacy_accepted_at timestamptz,
  privacy_version     text,
  approved_at         timestamptz,
  approved_by         uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_status_idx on public.profiles (status, created_at desc);
create index profiles_role_idx   on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text,
  source_name    text,                  -- texto original del archivo de origen
  active         boolean not null default true,
  public_visible boolean not null default true,   -- aparece en la home pública
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index categories_active_idx on public.categories (active, sort_order, name);

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id                        uuid primary key default gen_random_uuid(),
  sku                       text not null check (char_length(sku) between 1 and 64),
  sku_norm                  text not null default '',
  name                      text not null check (char_length(name) between 1 and 300),
  brand_id                  uuid references public.brands (id) on delete restrict,
  category_id               uuid references public.categories (id) on delete restrict,
  description               text check (description is null or char_length(description) <= 4000),
  -- Compatibilidad vehicular: SÓLO se muestra si fue verificada por el comercio.
  -- El importador nunca la completa ni la infiere de la descripción.
  compatibility             text check (compatibility is null or char_length(compatibility) <= 4000),
  compatibility_verified_at timestamptz,
  compatibility_verified_by uuid,
  sale_price_ars            numeric(14, 2) check (sale_price_ars is null or sale_price_ars >= 0),
  stock_status              public.stock_status not null default 'unknown',
  stock_quantity            integer check (stock_quantity is null or stock_quantity >= 0), -- sólo dato real; uso interno
  active                    boolean not null default true,
  image_path                text,       -- clave en Storage (bucket product-images)
  original_image_path       text,       -- ruta local de origen, ej. C:\FOTOS\TOCHTER\10000TOC.JPG (NO es URL)
  attributes                jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  search_text               text not null default '',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  updated_by                uuid
);
create unique index products_sku_key        on public.products (sku);
create index products_sku_norm_idx          on public.products (sku_norm);
create index products_category_active_idx   on public.products (category_id, active, name);
create index products_brand_active_idx      on public.products (brand_id, active, name);
create index products_active_name_idx       on public.products (active, name);
create index products_active_price_idx      on public.products (active, sale_price_ars);
create index products_search_trgm_idx       on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_sku_norm_trgm_idx     on public.products using gin (sku_norm extensions.gin_trgm_ops);

-- Costos: tabla separada en el esquema privado. Nunca accesible para clientes.
create table private.product_costs (
  product_id     uuid primary key references public.products (id) on delete cascade,
  cost_price_ars numeric(14, 2) not null check (cost_price_ars >= 0),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);

-- ---------------------------------------------------------------------------
-- Lista de consulta (persistente por cuenta) y consultas enviadas
-- ---------------------------------------------------------------------------
create table public.inquiry_list_items (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 999),
  added_at   timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create table public.product_inquiries (
  id          uuid primary key default gen_random_uuid(),
  number      bigint generated always as identity unique,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  status      public.inquiry_status not null default 'new',
  notes       text check (notes is null or char_length(notes) <= 1000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index product_inquiries_profile_idx on public.product_inquiries (profile_id, created_at desc);
create index product_inquiries_status_idx  on public.product_inquiries (status, created_at desc);

create table public.product_inquiry_items (
  id             uuid primary key default gen_random_uuid(),
  inquiry_id     uuid not null references public.product_inquiries (id) on delete cascade,
  product_id     uuid references public.products (id) on delete set null,
  sku_snapshot   text not null,
  name_snapshot  text not null,
  brand_snapshot text,
  quantity       integer not null check (quantity between 1 and 999)
);
create index product_inquiry_items_inquiry_idx on public.product_inquiry_items (inquiry_id);

-- ---------------------------------------------------------------------------
-- Registro de importaciones (sólo admin)
-- ---------------------------------------------------------------------------
create table public.import_jobs (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('catalog', 'costs')),
  filename        text not null check (char_length(filename) <= 255),
  user_id         uuid references public.profiles (id) on delete set null,
  status          text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_rows      integer not null default 0,
  created_count   integer not null default 0,
  updated_count   integer not null default 0,
  unchanged_count integer not null default 0,
  error_count     integer not null default 0,
  skipped_count   integer not null default 0,
  errors_json     jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index import_jobs_created_idx on public.import_jobs (created_at desc);

-- Rate limiting en base de datos (sirve en serverless, sin memoria compartida)
create table private.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger settings_touch    before update on public.settings          for each row execute function private.touch_updated_at();
create trigger profiles_touch    before update on public.profiles          for each row execute function private.touch_updated_at();
create trigger categories_touch  before update on public.categories        for each row execute function private.touch_updated_at();
create trigger brands_touch      before update on public.brands            for each row execute function private.touch_updated_at();
create trigger inquiries_touch   before update on public.product_inquiries for each row execute function private.touch_updated_at();

-- Producto: normaliza SKU y recalcula el texto de búsqueda.
create or replace function private.products_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_brand text;
  v_cat   text;
begin
  new.sku      := upper(btrim(regexp_replace(new.sku, '\s+', ' ', 'g')));
  new.sku_norm := public.normalize_sku(new.sku);
  new.name     := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  select b.name into v_brand from public.brands b where b.id = new.brand_id;
  select c.name into v_cat   from public.categories c where c.id = new.category_id;
  new.search_text := public.normalize_search(
    concat_ws(' ', new.sku, lower(new.sku_norm), new.name, new.description, v_brand, v_cat)
  );
  new.updated_at := now();
  return new;
end $$;

create trigger products_before_write
  before insert or update on public.products
  for each row execute function private.products_before_write();

-- Si cambia el nombre de una marca/rubro, se reindexa el texto de búsqueda.
create or replace function private.reindex_products_for_taxonomy()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    if tg_table_name = 'brands' then
      update public.products set updated_at = now() where brand_id = new.id;
    else
      update public.products set updated_at = now() where category_id = new.id;
    end if;
  end if;
  return new;
end $$;

create trigger brands_reindex     after update on public.brands     for each row execute function private.reindex_products_for_taxonomy();
create trigger categories_reindex after update on public.categories for each row execute function private.reindex_products_for_taxonomy();

-- Alta de usuario: crea el perfil. El rol SIEMPRE es 'customer': nunca se toma
-- de los metadatos que envía el navegador en el registro.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_requires_approval boolean;
  v_name  text;
  v_phone text;
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select s.requires_approval into v_requires_approval from public.settings s where s.id = 1;

  v_name := left(btrim(regexp_replace(coalesce(v_meta ->> 'full_name', ''), '[[:cntrl:]]', '', 'g')), 120);
  if v_name = '' then v_name := split_part(new.email, '@', 1); end if;

  v_phone := btrim(coalesce(v_meta ->> 'phone', ''));
  if v_phone !~ '^[0-9 +()-]{6,25}$' then v_phone := null; end if;

  insert into public.profiles (id, full_name, email, phone, role, status, privacy_accepted_at, privacy_version)
  values (
    new.id, v_name, coalesce(new.email, ''), v_phone,
    'customer',
    case when coalesce(v_requires_approval, true) then 'pending' else 'active' end::public.profile_status,
    case when (v_meta ->> 'privacy_accepted') = 'true' then now() end,
    left(v_meta ->> 'privacy_version', 40)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();
