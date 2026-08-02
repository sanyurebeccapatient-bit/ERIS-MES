/**
 * Normalizes any Rwanda phone number input into a consistent compact form:
 * "+2507XXXXXXXX" — no spaces, regardless of how it was typed in
 * (with spaces, a leading 0, a bare 250 prefix, etc).
 */
export function normalizePhone(value) {
  if (!value) return value
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('250')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 9)
  return digits ? `+250${digits}` : String(value).trim()
}

/**
 * True only for a fully-formed Rwanda number: "+250" followed by exactly
 * 9 digits (12 digits total once the leading "+" is dropped), starting
 * with 7. Rejects letters, symbols, and numbers that are too short/long.
 */
export function isValidPhone(value) {
  if (!value) return false
  const normalized = normalizePhone(value)
  return /^\+2507\d{8}$/.test(normalized) && normalized.replace(/\D/g, '').length === 12
}
