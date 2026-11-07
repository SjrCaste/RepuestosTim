import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="container-page py-6 sm:py-8" aria-busy="true" aria-label="Cargando catálogo">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <Skeleton className="mt-5 h-28 w-full rounded-2xl" />
      <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-4 h-9 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
