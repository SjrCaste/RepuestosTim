/**
 * Emulación mínima del entorno Supabase sobre PGlite (Postgres real en WASM)
 * para aplicar las migraciones reales y probar GRANTs/RLS por rol sin Docker.
 * Replica: roles anon/authenticated/service_role, auth.users, auth.uid(),
 * storage.buckets/objects, esquema extensions y los GRANT amplios por defecto
 * que Supabase otorga sobre "public" (para comprobar que las migraciones los revocan).
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

create schema extensions;
create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;

grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;

-- Igual que Supabase: privilegios amplios por defecto en public
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function createDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  await db.exec(SHIM);
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(path.join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migración ${file} falló: ${(e as Error).message}`);
    }
  }
  // service_role en Supabase tiene acceso total a public (por defecto) y bypassrls
  await db.exec(`grant all on all tables in schema public to service_role;`);
  return db;
}

export async function createUser(
  db: PGlite,
  opts: { email: string; confirmed?: boolean; meta?: Record<string, unknown> },
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, $3, $4)`,
    [id, opts.email, opts.confirmed === false ? null : new Date().toISOString(), JSON.stringify(opts.meta ?? {})],
  );
  return id;
}

/** Ejecuta fn como un rol de la API (anon / authenticated con uid). */
export async function as<T>(
  db: PGlite,
  who: { role: "anon" | "authenticated" | "service_role"; uid?: string },
  fn: (tx: PGlite) => Promise<T>,
): Promise<T> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who.uid ?? ""}', false);`);
  await db.exec(`set role ${who.role};`);
  try {
    return await fn(db);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

export async function expectDenied(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("Se esperaba un error de permisos y la operación fue permitida");
}
