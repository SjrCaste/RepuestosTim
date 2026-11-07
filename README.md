# TIM REPUESTOS · web + catálogo privado

Web pública + catálogo privado para clientes registrados + panel administrador.
Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage) · Vercel.

```bash
npm install
cp .env.example .env.local   # completar con los datos de Supabase
npm run dev                  # http://localhost:3000
npm test                     # 42 pruebas: normalización, importación, WhatsApp, RLS/permisos
npm run typecheck && npm run build
```

Sin variables de Supabase, la web pública funciona en **modo demostración** (datos del local por defecto) y todas las rutas privadas redirigen a login.

---

## 1. Supuestos a validar con el dueño (no bloquean el desarrollo)

| Tema | Estado en el código |
|---|---|
| Número de WhatsApp `+54 9 11 3003-7581` | Se usa por defecto. Marcar “confirmado” en /admin/configuracion. Hasta entonces no se publica en los datos para buscadores. |
| Horarios | Vacíos → se muestra “Consultá horarios por WhatsApp”. |
| “Retiro en Garín” | Oculto hasta activar `pickup_confirmed`. |
| Precios del archivo | Importados pero **ocultos** (`prices_visible_to_customers = false`). |
| Aprobación de cuentas | **Activada** por defecto (más conservador). Se cambia en Configuración. |
| Logo original | No llegó. Copiar a `public/brand/` y completar `BRAND.logoSrc` en `src/config/site.ts`. Mientras tanto se muestra el nombre en texto (no se redibuja el logo). |
| Fotos del local / productos | No llegaron. Se cargan desde el admin (Configuración / Imágenes). Sin foto: diseño alternativo o “Imagen no disponible”. |
| Política de privacidad y términos | Borradores marcados “pendiente de revisión”. Completar razón social, CUIT y domicilio legal. |
| Archivos de catálogo | `TOCHTER.XLS` y el CSV **no estaban en la carpeta del proyecto**: ver sección 4. |

## 2. Arquitectura y seguridad

- **Rutas**: públicas (`/`, `/categorias`, `/como-comprar`, `/nosotros`, `/contacto`, `/privacidad`, `/terminos`, ISR 5 min) · auth (`/ingresar`, `/registro`, `/recuperar`, `/restablecer`, `/verificar`, `/auth/confirm`) · privadas dinámicas (`/catalogo`, `/catalogo/[sku]`, `/catalogo/lista`, `/cuenta`, `/admin/*`).
- **Tres capas de control**: `src/proxy.ts` (sin sesión → login conservando `?next=` y la búsqueda) → verificación en cada página/acción (`requireCatalogAccess`, `requireAdmin`) → **base de datos** (GRANTs + RLS + RPC `SECURITY DEFINER`). Aunque falle una capa superior, la base no entrega datos.
- **Catálogo privado real**: anon y clientes **no pueden leer la tabla `products`**. Los clientes leen sólo vía `catalog_search` / `catalog_product` / `catalog_facets`, que validan email verificado + estado de la cuenta y devuelven `sale_price_ars = null` si los precios están ocultos (el valor nunca llega al navegador). Sin `generateStaticParams`, fuera del sitemap, `noindex` y `Cache-Control: private, no-store`.
- **Costos**: tabla `private.product_costs` en un esquema **no expuesto** por la API. Sólo RPC admin. Ninguna RPC de cliente tiene columna de costo (probado).
- **Roles**: el trigger de alta fija siempre `role = customer`; los metadatos del registro no pueden asignar rol (probado). Admin: `select private.set_admin('email')` en el SQL Editor o `scripts/promote-admin.mjs`.
- **Imágenes**: bucket privado `product-images` (URLs firmadas de 1 h; lectura sólo con acceso al catálogo; escritura sólo admin). Bucket público `site-assets` para fotos del local.
- **Anti-abuso**: rate limit en Postgres (login 8/10 min por email y 30 por IP, registro 6/h por IP, búsquedas 240/min por usuario, consultas 10/h), honeypot en registro, mensajes genéricos (no revela si un email existe), protección CSRF (Origin), CSP y cabeceras de seguridad, sin redirecciones abiertas.
- **Consultas**: el servidor arma la consulta desde la lista guardada en la base (no confía en el navegador), la registra **antes** de abrir WhatsApp y, si el registro falla, ofrece un enlace de respaldo.

Migraciones: `supabase/migrations/` (0001 esquema, 0002 RLS, 0003 RPC, 0004 Storage).

## 3. Puesta en marcha (lo que tenés que hacer vos)

### Supabase
1. Crear un proyecto en <https://supabase.com> (región São Paulo recomendada).
2. **SQL Editor** → ejecutar en orden los 4 archivos de `supabase/migrations/`. (O con CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`.)
3. **Authentication → Sign In / Providers → Email**: activar “Confirm email”. Contraseña mínima 10 caracteres. Si el plan lo permite, activar “Leaked password protection”.
4. **Authentication → URL Configuration**: Site URL = tu dominio (ej. `https://timrepuestos.com.ar`); Redirect URLs: `https://TU-DOMINIO/auth/confirm` y `http://localhost:3000/auth/confirm`.
5. **Authentication → Emails**: pegar `supabase/templates/confirmacion.html` (Confirm signup) y `recuperacion.html` (Reset password).
6. **Authentication → SMTP**: configurar un SMTP propio (el de Supabase sólo envía unos pocos emails por hora; no sirve para producción).
7. **Project Settings → API**: copiar URL, clave publishable/anon y clave secret/service_role a `.env.local`.
8. Registrarse en la web con el email del dueño, confirmar el email y luego: SQL Editor → `select private.set_admin('email-del-dueño');`

### Vercel
1. Subir el proyecto a un repositorio privado (GitHub) e importarlo en Vercel.
2. Variables de entorno: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (esta última sin prefijo `NEXT_PUBLIC_`).
3. Deploy. Agregar el dominio y actualizar Site URL / Redirect URLs en Supabase.

## 4. Importar el catálogo real

**Colocá los archivos en `data/private/`** (excluida de git):
`data/private/tim_repuestos_catalogo_tochter.csv` y `data/private/TOCHTER.XLS`.

```bash
npm run catalog:check -- data/private/tim_repuestos_catalogo_tochter.csv 10000TOC      # cifras, rubros, errores
npm run catalog:import-dry-run -- data/private/tim_repuestos_catalogo_tochter.csv     # importa 2 veces en una base local y verifica
```

Después, en **/admin/importar**: elegir “Catálogo”, subir el archivo, revisar la vista previa (20 filas), el mapeo de columnas y los errores, y confirmar. Se puede reimportar sin duplicar (UPSERT por SKU). Los productos que no vienen en el archivo **no se borran**: se ofrece desactivarlos con confirmación. Para costos: el mismo Excel con el modo “Costos”. Fotos: comprimir `C:\FOTOS\TOCHTER` en ZIP y subirlo en **/admin/imagenes** (asocia por nombre de archivo o SKU).

## 5. Checklist de QA

Leyenda: ✅ verificado localmente · 🔶 requiere Supabase conectado (no verificado todavía)

| Escenario | Estado |
|---|---|
| Anónimo en `/catalogo` y `/catalogo/10000TOC` → redirige a login (curl 307) | ✅ |
| Anónimo no puede leer productos, marcas, RPC de catálogo ni costos (SQL con rol `anon`) | ✅ (PGlite) |
| Cookie de sesión falsificada → redirige a login | ✅ |
| Búsqueda de cliente por `10000toc` / `10000-TOC` devuelve primero ese SKU | ✅ (datos sintéticos) |
| Cliente no puede leer costo por SQL/RPC; RPC de cliente sin columnas de costo | ✅ (PGlite) |
| Cuenta pendiente, email sin verificar o bloqueada → sin catálogo | ✅ (PGlite) |
| Importar 980 filas y reimportar → 980 creadas / luego 0 creadas, 980 sin cambios, sin duplicados | ✅ (sintético) |
| Importación con cambios: actualiza sólo lo modificado y no borra omitidos | ✅ |
| Precio oculto → `null` en RPC (no está en HTML/JSON) | ✅ (PGlite) |
| Registro no permite rol admin (metadatos ignorados) | ✅ (PGlite) |
| Mensaje de WhatsApp con cantidad, nombre y SKU, sin precios/costos | ✅ (unit) |
| Imagen ausente → placeholder “Imagen no disponible” | ✅ (componente) |
| Sitemap sólo con páginas públicas; HTML público sin SKUs | ✅ |
| Responsive 390 / 820 / 1440 px sin scroll horizontal; menú móvil; errores accesibles en formularios | ✅ (capturas Edge) |
| Registro → email → login → catálogo → consulta en móvil, de punta a punta | 🔶 |
| Emails de confirmación y recuperación | 🔶 |
| Subida de imágenes a Storage (individual y ZIP) | 🔶 |
| Importación del **CSV real** (980 productos, 9 rubros, `10000TOC`) | 🔶 falta el archivo |
| Rate limit de login/registro contra Supabase real | 🔶 |
| Lighthouse en producción | 🔶 |

Las pruebas de base de datos corren las **migraciones reales** sobre Postgres en memoria (PGlite) emulando roles y `auth.uid()` de Supabase. No reemplazan una prueba sobre el proyecto Supabase real, que se recomienda repetir tras el primer deploy.
