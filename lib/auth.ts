export interface AdminSession {
  admin_id: string
  nome: string
  role: 'superadmin' | 'admin' | 'marcador'
  token: string
}

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('admin_session')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function saveSession(session: AdminSession) {
  localStorage.setItem('admin_session', JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem('admin_session')
}

export function isSuperAdmin(): boolean {
  return getSession()?.role === 'superadmin'
}
