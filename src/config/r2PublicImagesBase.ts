/**
 * Base pública de imágenes estáticas (logo, ejecutivos, carriers, etc.) en Cloudflare R2.
 * En web: VITE_R2_PUBLIC_IMAGES. En móvil: EXPO_PUBLIC_R2_PUBLIC_IMAGES.
 */
export const R2_PUBLIC_IMAGES_BASE =
  "https://pub-c9f000918425461688b7a78254a067d9.r2.dev";

export function buildPublicImageUrl(
  base: string,
  path: string,
): string {
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
