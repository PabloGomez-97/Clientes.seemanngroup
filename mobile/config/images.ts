import {
  buildPublicImageUrl,
  R2_PUBLIC_IMAGES_BASE,
} from "../../src/config/r2PublicImagesBase";

const R2_BASE = (
  process.env.EXPO_PUBLIC_R2_PUBLIC_IMAGES ?? R2_PUBLIC_IMAGES_BASE
).replace(/\/$/, "");

export function imgUrl(path: string): string {
  return buildPublicImageUrl(R2_BASE, path);
}
