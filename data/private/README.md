# Archivos privados del catálogo

Colocá acá los archivos de origen. Esta carpeta está en `.gitignore` y **no se sube al repositorio ni a Vercel**.

- `tim_repuestos_catalogo_tochter.csv`: el CSV preparado (980 productos según lo informado).
- `TOCHTER.XLS`: el Excel original. Contiene PRCOSTO (dato reservado): nunca lo publiques.

Verificación offline (no toca la base):

```bash
npm run catalog:check -- data/private/tim_repuestos_catalogo_tochter.csv 10000TOC
npm run catalog:import-dry-run -- data/private/tim_repuestos_catalogo_tochter.csv 10000TOC
```

La importación real se hace desde **/admin/importar** con una cuenta administradora.
