/**
 * Attendance report summaries used to be stored as already-translated text
 * (e.g. "Present today — 3 present, 1 absent"). That text was frozen in
 * whatever language was active at submission time, so switching the app
 * language later could not re-translate it.
 *
 * New submissions instead store a language-neutral marker string with the
 * raw counts:
 *   __ATTENDANCE_SUMMARY__:present=3;absent=1;unmarked=2;total=6
 *
 * These helpers detect that marker and rebuild the human-readable text live,
 * using whatever locale is currently active (t()).
 */

const MARKER_PREFIX = '__ATTENDANCE_SUMMARY__:'

export function isAttendanceSummaryMarker(value) {
  return typeof value === 'string' && value.startsWith(MARKER_PREFIX)
}

function parseMarker(value) {
  const raw = value.slice(MARKER_PREFIX.length)
  const parts = {}
  for (const pair of raw.split(';')) {
    const [key, val] = pair.split('=')
    if (key) parts[key] = Number(val) || 0
  }
  return parts
}

/**
 * Rebuilds the short child-name-line summary, e.g.
 * "Attendance — 3 present, 1 absent of 6"
 */
export function translateAttendanceSummaryTitle(value, t) {
  if (!isAttendanceSummaryMarker(value)) return value
  const { present = 0, absent = 0, total = 0 } = parseMarker(value)
  return `${t('attendance.title')} — ${present} ${t('common.present').toLowerCase()}, ${absent} ${t('common.absent').toLowerCase()} ${t('common.of').toLowerCase()} ${total}`
}

/**
 * Rebuilds the longer notes-line summary, e.g.
 * "Attendance: 3 present, 1 absent, 2 unmarked of 6 children."
 */
export function translateAttendanceSummaryNotes(value, t) {
  if (!isAttendanceSummaryMarker(value)) return value
  const { present = 0, absent = 0, unmarked = 0, total = 0 } = parseMarker(value)
  return `${t('attendance.title')}: ${present} ${t('common.present').toLowerCase()}, ${absent} ${t('common.absent').toLowerCase()}, ${unmarked} ${t('common.unmarked').toLowerCase()} ${t('common.of').toLowerCase()} ${total} ${t('common.children').toLowerCase()}.`
}
