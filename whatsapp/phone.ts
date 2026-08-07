/** Digits only, no leading +. */
export function phoneDigits(phone: string): string {
  return String(phone || '')
    .trim()
    .replace(/^\+/, '')
    .replace(/\D/g, '');
}

/** E.164 with leading +. */
export function toE164(phone: string): string {
  const digits = phoneDigits(phone);
  return digits ? `+${digits}` : '';
}

export function isValidPhoneDigits(digits: string): boolean {
  return /^[1-9]\d{7,14}$/.test(digits);
}

export function jidToPhoneDigits(jid: string): string {
  const user = String(jid || '')
    .split('@')[0]
    .split(':')[0];
  return phoneDigits(user);
}
