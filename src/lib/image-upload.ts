/** Validación de imágenes del lado del cliente por firma binaria (no por extensión). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Clave de Storage segura a partir del SKU. */
export function storageKeyForSku(sku: string, type: string): string {
  const safe = sku.toUpperCase().replace(/[^A-Z0-9._-]/g, "_").slice(0, 80) || "producto";
  return `products/${safe}-${Date.now().toString(36)}.${EXT[type] ?? "jpg"}`;
}
