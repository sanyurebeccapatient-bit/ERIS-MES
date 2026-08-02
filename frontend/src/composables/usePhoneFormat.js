/**
 * Rwanda phone number formatting
 * -----------------------------------------------------------------------
 * Formats any input into the shape "+250 7XX XXX XXX" as the user types,
 * and normalizes it back to "+2507XXXXXXXX" (no spaces) for the API.
 * -----------------------------------------------------------------------
 */

/** Strips everything but digits, then drops a leading country/trunk prefix. */
function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

/**
 * Normalizes any raw input (with or without +250, 250, or a leading 0)
 * down to the 9 significant digits starting with 7, e.g. "781114085".
 */
export function extractLocalDigits(value) {
  let digits = digitsOnly(value)
  if (digits.startsWith('250')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 9)
}

/**
 * Formats a raw phone value into the display shape "+250 7XX XXX XXX",
 * growing as the user types. Always keeps the +250 prefix visible.
 */
export function formatRwandaPhone(value) {
  const local = extractLocalDigits(value)
  let out = '+250'
  if (!local) return out
  out += ' ' + local.slice(0, 3)
  if (local.length > 3) out += ' ' + local.slice(3, 6)
  if (local.length > 6) out += ' ' + local.slice(6, 9)
  return out
}

/** Converts a formatted/partial value into the compact E.164-ish form for the API: +2507XXXXXXXX */
export function toCompactPhone(value) {
  const local = extractLocalDigits(value)
  return local ? `+250${local}` : ''
}

/** True once the user has entered a full 9-digit Rwanda number starting with 7. */
export function isCompleteRwandaPhone(value) {
  const local = extractLocalDigits(value)
  return /^7\d{8}$/.test(local)
}

/**
 * v-model-friendly input handler: formats on every keystroke and keeps the
 * caret from getting stuck by always re-deriving from digits.
 * Usage: <input :value="phone" @input="phone = onPhoneInput($event)" />
 */
export function onPhoneInput(event) {
  return formatRwandaPhone(event.target.value)
}

/**
 * Keydown guard for phone inputs: blocks any letter/symbol keystroke before
 * it ever reaches the field, so non-numeric characters can't be typed in
 * the first place (formatRwandaPhone still strips anything that slips
 * through via paste, autofill, etc). Attach as @keydown="blockNonDigitKey".
 */
export function blockNonDigitKey(event) {
  // Allow control/navigation keys (backspace, delete, arrows, tab, etc.)
  if (event.key.length > 1 || event.ctrlKey || event.metaKey || event.altKey) return
  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

export function usePhoneFormat() {
  return {
    formatRwandaPhone,
    toCompactPhone,
    isCompleteRwandaPhone,
    extractLocalDigits,
    onPhoneInput,
    blockNonDigitKey,
  }
}
