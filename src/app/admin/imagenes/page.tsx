import { requireAdmin } from "@/lib/auth/access";
import { PageHeader, Alert } from "@/components/ui/feedback";
import { BulkImages } from "@/components/admin/bulk-images";

export const metadata = { title: "Imágenes" };

export default async function ImagenesPage() {
  await requireAdmin();
  return (
    <div className="grid gap-5">
      <PageHeader title="Imágenes de productos" description="Asociá fotos reales a los productos en lote. Para una sola foto, usá la ficha del producto." />
      <Alert tone="info">
        Las rutas del Excel (C:\FOTOS\...) son archivos de la computadora del local, no direcciones web. Copiá esa carpeta, comprimila en
        ZIP y subila acá: el sistema asocia cada foto por nombre de archivo o por SKU. Los productos sin foto muestran “Imagen no disponible”.
      </Alert>
      <BulkImages />
    </div>
  );
}
