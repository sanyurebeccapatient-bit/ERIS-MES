import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/app/dashboard',
  },
  {
    path: '/app',
    component: () => import('@/components/layout/CaregiverShell.vue'),
    children: [
      { path: 'dashboard', name: 'caregiver-dashboard', component: () => import('@/views/caregiver/DashboardView.vue') },
      { path: 'children', name: 'children', component: () => import('@/views/caregiver/ChildrenView.vue') },
      { path: 'attendance', name: 'attendance', component: () => import('@/views/caregiver/AttendanceView.vue') },
      { path: 'attendance/reports', name: 'attendance-reports', component: () => import('@/views/caregiver/AttendanceReportsView.vue') },
      { path: 'visits', name: 'visits', component: () => import('@/views/caregiver/VisitsView.vue') },
      { path: 'report/new', name: 'new-report', component: () => import('@/views/caregiver/NewReportView.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('@/views/caregiver/NotificationsView.vue') },
      { path: 'profile', name: 'profile', component: () => import('@/views/caregiver/ProfileView.vue') },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/components/layout/AdminShell.vue'),
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboardView.vue') },
      { path: 'caregivers', name: 'admin-caregivers', component: () => import('@/views/admin/AdminCaregiversView.vue') },
      { path: 'centers', name: 'admin-centers', component: () => import('@/views/admin/AdminCentersView.vue') },
      { path: 'reports', name: 'admin-reports', component: () => import('@/views/admin/AdminReportsView.vue') },
      { path: 'alerts', name: 'admin-alerts', component: () => import('@/views/admin/AdminHealthAlertsView.vue') },
      { path: 'notifications', name: 'admin-notifications', component: () => import('@/views/admin/AdminNotificationsView.vue') },
      { path: 'audit', name: 'admin-audit', component: () => import('@/views/admin/AdminAuditLogView.vue') },
      { path: 'profile', name: 'admin-profile', component: () => import('@/views/admin/AdminProfileView.vue') },
    ],
  },
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
  },
  {
    path: '/offline',
    name: 'offline',
    component: () => import('@/views/OfflineView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/ErrorView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (to.name === 'login' || to.name === 'offline') return true

  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    const restored = await authStore.restoreSession()
    if (!restored) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // Keep caregivers out of /admin and non-admins can't reach it either way
  if (to.path.startsWith('/admin') && !authStore.isAdminRole) {
    return { name: 'caregiver-dashboard' }
  }

  // Keep admins/supervisors out of the caregiver app area (e.g. root redirect
  // or reopening the app while already logged in should land on admin/dashboard)
  if (to.path.startsWith('/app') && authStore.isAdminRole) {
    return { name: 'admin-dashboard' }
  }

  return true
})

export default router
