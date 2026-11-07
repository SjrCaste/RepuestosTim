import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="container-page py-12">
      <EmptyState icon={<PackageSearch />} title="Producto no encontrado" action={<ButtonLink href="/catalogo">Volver al catálogo</ButtonLink>}>
        El código no existe o el producto ya no está disponible en el catálogo.
      </EmptyState>
    </div>
  );
}
