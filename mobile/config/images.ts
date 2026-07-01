import { MOBILE_API_BASE } from "../../src/auth/authApi";

export function imgUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${MOBILE_API_BASE}${cleanPath}`;
}
