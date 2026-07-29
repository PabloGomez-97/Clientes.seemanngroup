export const MAX_TRACK_TAGS = 10;
export const MAX_TRACK_TAG_LENGTH = 64;

export type AddTrackTagResult =
  | { ok: true; tag: string }
  | { ok: false; error: string };

export function normalizeTrackTag(value: string): string {
  return value.trim();
}

export function canAddTrackTag(
  existingTags: string[],
  candidate: string,
): AddTrackTagResult {
  const tag = normalizeTrackTag(candidate);
  if (!tag) {
    return { ok: false, error: "La etiqueta no puede estar vacía." };
  }
  if (tag.length > MAX_TRACK_TAG_LENGTH) {
    return {
      ok: false,
      error: `Cada etiqueta puede tener máximo ${MAX_TRACK_TAG_LENGTH} caracteres.`,
    };
  }
  if (existingTags.length >= MAX_TRACK_TAGS) {
    return {
      ok: false,
      error: `Máximo ${MAX_TRACK_TAGS} etiquetas permitidas.`,
    };
  }
  if (
    existingTags.some(
      (value) => normalizeTrackTag(value).toLowerCase() === tag.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Esa etiqueta ya fue agregada." };
  }
  return { ok: true, tag };
}
