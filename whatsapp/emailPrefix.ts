const LEGAL_SUFFIXES = new Set([
  'sa',
  'spa',
  'ltda',
  'limitada',
  'eirl',
  'inc',
  'llc',
  'corp',
  'co',
  'company',
  'the',
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
]);

/** Misma regla que /admin/users y la app móvil. */
export function generateCompanyEmailPrefix(
  companyName: string,
  existingEmails: string[] = [],
): string {
  const normalized = companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  const filtered = words.filter((w) => !LEGAL_SUFFIXES.has(w));
  const base = (filtered.length > 0 ? filtered : words).join('');
  if (!base) return 'cliente';

  const truncated = base.slice(0, 13);
  const existing = new Set(existingEmails.map((e) => e.toLowerCase()));

  const candidates = [
    truncated,
    truncated + 'chile',
    truncated + 'cl',
    ...Array.from({ length: 10 }, (_, i) => truncated + (i + 1)),
  ];

  for (const candidate of candidates) {
    if (!existing.has(candidate + '@seemanngroup.com')) {
      return candidate;
    }
  }

  return truncated + Date.now().toString().slice(-4);
}

export function normalizeCompanyName(value: string): string {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
