import type { UserRole } from './types'

export function canWrite(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canDelete(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canManageCompliance(role?: UserRole): boolean {
  return canWrite(role)
}
