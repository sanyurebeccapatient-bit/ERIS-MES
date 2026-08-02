// Central place for enums/constants shared between UI and (future) backend contracts.
// Keeping these as plain strings (not magic numbers) makes it trivial to mirror
// them in a Mongoose schema later without translation.

export const USER_ROLES = {
  CAREGIVER: 'caregiver',
  FIELD_OFFICER: 'field_officer',
  CENTER_MANAGER: 'center_manager',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
}

export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  SYNCING: 'syncing',
  FAILED: 'failed',
  OFFLINE: 'offline',
}

export const VISIT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
}

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
}

export const HEALTH_ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  SNACK: 'snack',
  DINNER: 'dinner',
}

export const REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

// Feature flag: toggled once a real backend exists.
// See src/services/api/client.js
export const USE_MOCK_API = false
