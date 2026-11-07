"use client";
import { RotateCw } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

export default function CatalogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-12">
      <Alert tone="bad" title="No pudimos cargar el catálogo" live>
        Puede ser un problema momentáneo de conexión. Probá de nuevo en unos segundos.
      </Alert>
      <Button className="mt-4" variant="outline" onClick={reset}>
        <RotateCw aria-hidden /> Reintentar
      </Button>
    </div>
  );
}
