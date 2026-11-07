import type { Metadata } from "next";
import { InquiryList } from "@/components/catalog/inquiry-list";
import { PageHeader } from "@/components/ui/feedback";
import { requireCatalogAccess } from "@/lib/auth/access";
import { getFacets, getInquiryList } from "@/lib/catalog";

export const metadata: Metadata = { title: "Mi lista de consulta" };

export default async function ListaPage() {
  await requireCatalogAccess("/catalogo/lista");
  const [items, facets] = await Promise.all([getInquiryList(), getFacets()]);
  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader eyebrow="Lista de consulta" title="Mi lista" description="Revisá productos y cantidades antes de enviar la consulta. La lista queda guardada en tu cuenta." />
      <div className="mt-6">
        <InquiryList initialItems={items} pricesVisible={facets.prices_visible} />
      </div>
    </div>
  );
}
