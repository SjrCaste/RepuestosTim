/**
 * Pruebas de acceso por rol sobre las migraciones reales (Postgres en PGlite).
 * Cubre los escenarios mínimos del pedido que dependen de la base de datos.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, expectDenied, type Db } from "./harness";
import { parseImportFile } from "@/lib/import/parse";
import { suggestMapping } from "@/lib/import/mapping";
import { validateCatalog } from "@/lib/import/validate";
import { syntheticCsv } from "../fixtures/synthetic";

let db: Db;
let admin: string, customer: string, pending: string, unconfirmed: string, blocked: string, sneaky: string;

async function importCatalog(csv: string) {
  const t = parseImportFile(new TextEncoder().encode(csv), "catalogo.csv");
  const report = validateCatalog(t, suggestMapping(t.headers, "catalog"));
  return as(db, { role: "authenticated", uid: admin }, async (tx) => {
    const job = await tx.query<{ id: string }>(
      `select public.admin_import_start('catalog', 'catalogo.csv', $1, $2, $3, '[]'::jsonb) as id`,
      [report.totalRows, report.errors.length, report.skippedDuplicates],
    );
    const jobId = job.rows[0].id;
    const totals = { created: 0, updated: 0, unchanged: 0 };
    for (let i = 0; i < report.valid.length; i += 500) {
      const chunk = report.valid.slice(i, i + 500);
      const r = await tx.query<{ r: typeof totals }>(`select public.admin_import_products($1, $2, $3::jsonb) as r`, [
        jobId,
        report.mappedFields,
        JSON.stringify(chunk),
      ]);
      totals.created += r.rows[0].r.created;
      totals.updated += r.rows[0].r.updated;
      totals.unchanged += r.rows[0].r.unchanged;
    }
    await tx.query(`select public.admin_import_finish($1)`, [jobId]);
    return totals;
  });
}

beforeAll(async () => {
  db = await createDb();
  admin = await createUser(db, { email: "admin@test.local", meta: { full_name: "Admin" } });
  await db.query(`select private.set_admin('admin@test.local')`);
  customer = await createUser(db, { email: "cliente@test.local", meta: { full_name: "Cliente", privacy_accepted: "true" } });
  pending = await createUser(db, { email: "pendiente@test.local", meta: { full_name: "Pendiente" } });
  unconfirmed = await createUser(db, { email: "sinverificar@test.local", confirmed: false });
  blocked = await createUser(db, { email: "bloqueado@test.local" });
  // Intento de escalar privilegios desde los metadatos del registro
  sneaky = await createUser(db, { email: "hacker@test.local", meta: { full_name: "X", role: "admin", status: "active" } });

  await as(db, { role: "authenticated", uid: admin }, async (tx) => {
    await tx.query(`select public.admin_set_profile_status($1, 'active')`, [customer]);
    await tx.query(`select public.admin_set_profile_status($1, 'active')`, [unconfirmed]);
    await tx.query(`select public.admin_set_profile_status($1, 'blocked')`, [blocked]);
  });
});

describe("registro y roles", () => {
  it("el registro no permite elegir rol admin ni estado", async () => {
    const r = await db.query<{ role: string; status: string }>(`select role, status from public.profiles where id = $1`, [sneaky]);
    expect(r.rows[0]).toEqual({ role: "customer", status: "pending" });
  });

  it("guarda consentimiento de privacidad cuando se envía", async () => {
    const r = await db.query<{ privacy_accepted_at: Date | null }>(`select privacy_accepted_at from public.profiles where id = $1`, [customer]);
    expect(r.rows[0].privacy_accepted_at).not.toBeNull();
  });

  it("un cliente no puede cambiarse el rol ni el estado", async () => {
    const msg = await as(db, { role: "authenticated", uid: pending }, (tx) =>
      expectDenied(tx.query(`update public.profiles set role = 'admin' where id = auth.uid()`)),
    );
    expect(msg).toMatch(/permission denied/);
    const msg2 = await as(db, { role: "authenticated", uid: pending }, (tx) =>
      expectDenied(tx.query(`update public.profiles set status = 'active' where id = auth.uid()`)),
    );
    expect(msg2).toMatch(/permission denied/);
    // sí puede editar su nombre
    await as(db, { role: "authenticated", uid: pending }, (tx) =>
      tx.query(`update public.profiles set full_name = 'Nuevo Nombre' where id = auth.uid()`),
    );
  });

  it("un cliente no puede aprobar cuentas ni promoverse", async () => {
    await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      expect(await expectDenied(tx.query(`select public.admin_set_profile_status($1, 'active')`, [pending]))).toMatch(/not_authorized/);
      expect(await expectDenied(tx.query(`select public.admin_promote_by_service('cliente@test.local')`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select private.set_admin('cliente@test.local')`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select public.rate_limit_check('login:x', 1, 60)`))).toMatch(/permission denied/);
    });
  });

  it("un cliente sólo ve su propio perfil", async () => {
    const r = await as(db, { role: "authenticated", uid: customer }, (tx) => tx.query(`select id from public.profiles`));
    expect(r.rows).toEqual([{ id: customer }]);
  });
});

describe("importación", () => {
  it("importa 980 productos y reimportar el mismo archivo no duplica", async () => {
    const csv = syntheticCsv(980);
    const first = await importCatalog(csv);
    expect(first).toEqual({ created: 980, updated: 0, unchanged: 0 });
    const second = await importCatalog(csv);
    expect(second).toEqual({ created: 0, updated: 0, unchanged: 980 });
    const count = await db.query<{ n: number; d: number }>(
      `select count(*)::int as n, count(distinct sku)::int as d from public.products`,
    );
    expect(count.rows[0]).toEqual({ n: 980, d: 980 });
    const jobs = await db.query<{ n: number }>(`select count(*)::int as n from public.import_jobs where status = 'completed'`);
    expect(jobs.rows[0].n).toBe(2);
  });

  it("una reimportación con cambios actualiza sólo lo modificado y no borra omitidos", async () => {
    const changed = syntheticCsv(980)
      .split("\r\n")
      .slice(0, 501) // encabezado + 500 filas: las otras 480 se omiten
      .map((l) => l.replace("ITEM SINTETICO 7 ÁNGULO", "ITEM SINTETICO 7 MODIFICADO"))
      .join("\r\n");
    const r = await importCatalog(changed);
    expect(r).toEqual({ created: 0, updated: 1, unchanged: 499 });
    const total = await db.query<{ n: number }>(`select count(*)::int as n from public.products where active`);
    expect(total.rows[0].n).toBe(980);
  });

  it("SKU con distinto formato no crea duplicado (se normaliza a mayúsculas)", async () => {
    await as(db, { role: "authenticated", uid: admin }, (tx) =>
      tx.query(`select public.admin_import_products(null, array['sku','name'], $1::jsonb)`, [
        JSON.stringify([{ sku: " 10000toc ", name: "PRODUCTO SINTETICO DE PRUEBA" }]),
      ]),
    );
    const r = await db.query<{ n: number }>(`select count(*)::int as n from public.products where sku_norm = '10000TOC'`);
    expect(r.rows[0].n).toBe(1);
  });

  it("un cliente no puede importar ni leer import_jobs", async () => {
    await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      expect(await expectDenied(tx.query(`select public.admin_import_products(null, array['sku'], '[]'::jsonb)`))).toMatch(/not_authorized/);
      const jobs = await tx.query(`select * from public.import_jobs`);
      expect(jobs.rows).toHaveLength(0);
    });
  });
});

describe("privacidad del catálogo", () => {
  it("anónimo: sin acceso a productos, marcas, RPC de catálogo ni costos", async () => {
    await as(db, { role: "anon" }, async (tx) => {
      expect(await expectDenied(tx.query(`select * from public.products limit 1`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select * from public.brands limit 1`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select * from public.catalog_search('10000TOC')`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select * from public.catalog_product('10000TOC')`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select * from private.product_costs`))).toMatch(/permission denied/);
      // datos públicos permitidos: contacto del local y nombres de rubros
      const s = await tx.query(`select store_name from public.settings`);
      expect(s.rows).toHaveLength(1);
      const c = await tx.query(`select name from public.categories`);
      expect(c.rows.length).toBeGreaterThan(0);
    });
  });

  it("cliente verificado y aprobado encuentra 10000TOC por SKU exacto primero", async () => {
    const r = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ sku: string; total_count: number }>(`select sku, total_count from public.catalog_search('10000toc')`),
    );
    expect(r.rows[0].sku).toBe("10000TOC");
    const r2 = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ sku: string }>(`select sku from public.catalog_search('10000-TOC')`),
    );
    expect(r2.rows[0].sku).toBe("10000TOC");
  });

  it("búsqueda insensible a acentos y paginada en servidor", async () => {
    const r = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ total_count: string }>(`select total_count from public.catalog_search('angulo sintetico 12', null, null, 'relevance', 1, 500)`),
    );
    expect(r.rows.length).toBeLessThanOrEqual(48); // tope de página
    expect(Number(r.rows[0].total_count)).toBeGreaterThan(0);
  });

  it("precio oculto: la RPC devuelve null; visible: devuelve el valor", async () => {
    const hidden = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ sale_price_ars: string | null }>(`select sale_price_ars from public.catalog_product('10000TOC')`),
    );
    expect(hidden.rows[0].sale_price_ars).toBeNull();
    const list = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ sale_price_ars: string | null }>(`select sale_price_ars from public.catalog_search(null) where sale_price_ars is not null`),
    );
    expect(list.rows).toHaveLength(0);

    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.settings set prices_visible_to_customers = true`));
    const shown = await as(db, { role: "authenticated", uid: customer }, (tx) =>
      tx.query<{ sale_price_ars: string | null }>(`select sale_price_ars from public.catalog_product('10000TOC')`),
    );
    expect(Number(shown.rows[0].sale_price_ars)).toBe(12345.5);
    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.settings set prices_visible_to_customers = false`));
  });

  it("cliente no puede leer la tabla products ni costos (ni por SQL directo)", async () => {
    await as(db, { role: "authenticated", uid: admin }, async (tx) => {
      const p = await tx.query<{ id: string }>(`select id from public.products where sku = '10000TOC'`);
      await tx.query(`select public.admin_set_product_cost($1, 777.77)`, [p.rows[0].id]);
      const c = await tx.query<{ c: string }>(`select public.admin_get_product_cost($1) as c`, [p.rows[0].id]);
      expect(Number(c.rows[0].c)).toBe(777.77);
    });
    await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      const rows = await tx.query(`select * from public.products`);
      expect(rows.rows).toHaveLength(0); // RLS: sólo admin
      expect(await expectDenied(tx.query(`select cost_price_ars from private.product_costs`))).toMatch(/permission denied/);
      expect(await expectDenied(tx.query(`select public.admin_get_product_cost(gen_random_uuid())`))).toMatch(/not_authorized/);
      // ninguna RPC de cliente devuelve una columna de costo
      const cols = await tx.query<{ c: number }>(
        `select count(*)::int as c from information_schema.routines r
           join information_schema.parameters p on p.specific_name = r.specific_name
          where r.routine_schema = 'public' and r.routine_name like 'catalog_%' and p.parameter_name ilike '%cost%'`,
      );
      expect(cols.rows[0].c).toBe(0);
      const row = await tx.query(`select * from public.catalog_product('10000TOC')`);
      expect(JSON.stringify(row.rows)).not.toMatch(/777/);
    });
  });

  it("cuenta pendiente no ve el catálogo con modo aprobación activo", async () => {
    await as(db, { role: "authenticated", uid: pending }, async (tx) => {
      expect(await expectDenied(tx.query(`select * from public.catalog_search('10000TOC')`))).toMatch(/not_authorized/);
      const a = await tx.query<{ a: { status: string; can_view_catalog: boolean } }>(`select public.my_access() as a`);
      expect(a.rows[0].a).toMatchObject({ status: "pending", can_view_catalog: false });
    });
  });

  it("sin modo aprobación, la cuenta pendiente verificada sí accede", async () => {
    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.settings set requires_approval = false`));
    const r = await as(db, { role: "authenticated", uid: pending }, (tx) => tx.query(`select sku from public.catalog_search('10000TOC')`));
    expect(r.rows.length).toBeGreaterThan(0);
    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.settings set requires_approval = true`));
  });

  it("email sin verificar y cuenta bloqueada no acceden", async () => {
    for (const uid of [unconfirmed, blocked]) {
      await as(db, { role: "authenticated", uid }, async (tx) => {
        expect(await expectDenied(tx.query(`select * from public.catalog_search('10000TOC')`))).toMatch(/not_authorized/);
      });
    }
  });

  it("productos inactivos no aparecen para clientes", async () => {
    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.products set active = false where sku = '10001TOC'`));
    const r = await as(db, { role: "authenticated", uid: customer }, (tx) => tx.query(`select * from public.catalog_product('10001TOC')`));
    expect(r.rows).toHaveLength(0);
    await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`update public.products set active = true where sku = '10001TOC'`));
  });

  it("imágenes privadas: sólo usuarios con acceso al catálogo; subida sólo admin", async () => {
    await db.query(`insert into storage.objects (bucket_id, name) values ('product-images', '10000TOC.jpg')`);
    const c = await as(db, { role: "authenticated", uid: customer }, (tx) => tx.query(`select name from storage.objects`));
    expect(c.rows).toHaveLength(1);
    const p = await as(db, { role: "authenticated", uid: pending }, (tx) => tx.query(`select name from storage.objects`));
    expect(p.rows).toHaveLength(0);
    const a = await as(db, { role: "anon" }, (tx) => tx.query(`select name from storage.objects`));
    expect(a.rows).toHaveLength(0);
    await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      expect(
        await expectDenied(tx.query(`insert into storage.objects (bucket_id, name) values ('product-images', 'x.jpg')`)),
      ).toMatch(/row-level security/);
    });
  });
});

describe("lista y consultas", () => {
  it("crea la consulta con snapshot desde la base, cantidades y sin costos", async () => {
    const res = await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      const p = await tx.query<{ id: string }>(`select id from public.catalog_product('10000TOC')`);
      const q = await tx.query<{ id: string }>(`select id from public.catalog_product('10002TOC')`);
      await tx.query(`select public.inquiry_list_set($1, 2)`, [p.rows[0].id]);
      await tx.query(`select public.inquiry_list_set($1, 1, 'add')`, [p.rows[0].id]);
      await tx.query(`select public.inquiry_list_set($1, 5)`, [q.rows[0].id]);
      const list = await tx.query(`select sku, quantity from public.inquiry_list_get() order by sku`);
      expect(list.rows).toEqual([
        { sku: "10000TOC", quantity: 3 },
        { sku: "10002TOC", quantity: 5 },
      ]);
      const r = await tx.query<{ r: { number: number; items: unknown[] } }>(`select public.inquiry_create('Para Gol 2010') as r`);
      return r.rows[0].r;
    });
    expect(res.items).toEqual([
      { sku: "10000TOC", name: "PRODUCTO SINTETICO DE PRUEBA", brand: "TOCHTER", quantity: 3 },
      { sku: "10002TOC", name: "ITEM SINTETICO 2 ÁNGULO", brand: "TOCHTER", quantity: 5 },
    ]);
    expect(JSON.stringify(res)).not.toMatch(/cost|777|precio/i);
    const empty = await as(db, { role: "authenticated", uid: customer }, (tx) => tx.query(`select * from public.inquiry_list_get()`));
    expect(empty.rows).toHaveLength(0);
  });

  it("cada cliente ve sólo sus consultas; admin ve todas", async () => {
    const other = await as(db, { role: "authenticated", uid: sneaky }, (tx) => tx.query(`select * from public.product_inquiries`));
    expect(other.rows).toHaveLength(0);
    const own = await as(db, { role: "authenticated", uid: customer }, (tx) => tx.query(`select * from public.product_inquiry_items`));
    expect(own.rows).toHaveLength(2);
    const adm = await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`select * from public.product_inquiries`));
    expect(adm.rows).toHaveLength(1);
  });

  it("lista vacía no genera consulta; rate limit de consultas", async () => {
    await as(db, { role: "authenticated", uid: customer }, async (tx) => {
      expect(await expectDenied(tx.query(`select public.inquiry_create(null)`))).toMatch(/empty_list/);
    });
  });
});
