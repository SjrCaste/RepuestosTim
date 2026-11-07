"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  History,
  Images,
  Tags,
  Users,
  Inbox,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/importar", label: "Importar", icon: FileSpreadsheet },
  { href: "/admin/importaciones", label: "Historial", icon: History },
  { href: "/admin/imagenes", label: "Imágenes", icon: Images },
  { href: "/admin/rubros", label: "Rubros y marcas", icon: Tags },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/consultas", label: "Consultas", icon: Inbox },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav({ pendingUsers, newInquiries }: { pendingUsers: number; newInquiries: number }) {
  const pathname = usePathname();
  const badges: Record<string, number> = { "/admin/usuarios": pendingUsers, "/admin/consultas": newInquiries };
  return (
    <nav aria-label="Administración" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const badge = badges[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-[15px] font-medium transition-colors",
                  active ? "bg-graphite text-white" : "text-carbon hover:bg-graphite/5",
                )}
              >
                <Icon className={cn("size-[18px]", active ? "text-brand" : "text-muted")} aria-hidden />
                {label}
                {badge ? (
                  <span className="ml-auto rounded-full bg-brand px-1.5 text-xs font-bold text-graphite" aria-label={`${badge} pendientes`}>
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
