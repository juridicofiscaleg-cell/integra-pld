import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { UserRole } from './types'

export type NavItem = {
  to: string
  icon: LucideIcon
  label: string
  mobilePrimary?: boolean
  roles?: UserRole[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', mobilePrimary: true },
  { to: '/clientes', icon: Users, label: 'Clientes', mobilePrimary: true },
  { to: '/expedientes', icon: FolderOpen, label: 'Expedientes', mobilePrimary: true },
  { to: '/kyc', icon: FileCheck, label: 'KYC' },
  { to: '/cumplimiento', icon: Scale, label: 'Oficiales de Cumplimiento' },
  { to: '/operaciones', icon: ClipboardList, label: 'Operaciones' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/biblioteca', icon: BookOpen, label: 'Biblioteca' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas', mobilePrimary: true },
  { to: '/autorizaciones', icon: ShieldCheck, label: 'Autorizaciones', roles: ['admin', 'abogado'] },
  { to: '/bitacora', icon: Shield, label: 'Bitácora', roles: ['admin', 'abogado'] },
  { to: '/reportes', icon: FileSpreadsheet, label: 'Reportes', roles: ['admin', 'abogado'] },
  { to: '/buscar', icon: Search, label: 'Buscar' },
]

export function navItemsForRole(role?: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))
}

export function mobileNavItems(role?: UserRole): NavItem[] {
  const allowed = navItemsForRole(role)
  const primary = allowed.filter((i) => i.mobilePrimary)
  return primary.length >= 4 ? primary.slice(0, 4) : allowed.slice(0, 4)
}

export function canWrite(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canDelete(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canManageCompliance(role?: UserRole): boolean {
  return canWrite(role)
}

export function canApproveKyc(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canEditRiskMatrix(role?: UserRole): boolean {
  return canWrite(role)
}

export function canExportBundle(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canViewAuditLog(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canViewReports(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canReviewApprovals(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

export function canManageTeam(role?: UserRole): boolean {
  return role === 'admin' || role === 'abogado'
}

/** Auxiliar: puede solicitar acciones sensibles en lugar de ejecutarlas */
export function needsApprovalForSensitive(role?: UserRole): boolean {
  return role === 'asistente'
}

export function isAccountActive(profile?: { account_status?: string } | null): boolean {
  if (!profile) return false
  return !profile.account_status || profile.account_status === 'activo'
}

export function isAccountPending(profile?: { account_status?: string } | null): boolean {
  return profile?.account_status === 'pendiente'
}

export function isAccountRejected(profile?: { account_status?: string } | null): boolean {
  return profile?.account_status === 'rechazado'
}
