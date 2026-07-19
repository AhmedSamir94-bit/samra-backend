/** Digits only; Egypt local 01XXXXXXXXX → 201XXXXXXXXX for WhatsApp @c.us */
export function normalizeWhatsappPhone(phone: string) {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 11) {
    digits = `20${digits.slice(1)}`;
  }

  return digits;
}
