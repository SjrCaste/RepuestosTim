#!/usr/bin/env node
/**
 * Asigna el rol admin a un usuario YA REGISTRADO (con email confirmado).
 * Uso:  node --env-file=.env.local scripts/promote-admin.mjs dueño@ejemplo.com
 * Requiere SUPABASE_SERVICE_ROLE_KEY (sólo en tu máquina / servidor, nunca en el navegador).
 * Alternativa sin script: en Supabase → SQL Editor:  select private.set_admin('dueño@ejemplo.com');
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
  console.error("Uso: node --env-file=.env.local scripts/promote-admin.mjs email@dominio.com");
  process.exit(1);
}
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.rpc("admin_promote_by_service", { p_email: email });
if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(data);
