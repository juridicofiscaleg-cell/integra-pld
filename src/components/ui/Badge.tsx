import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
  className?: string
}

const variants = {
  default: 'badge-default',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  muted: 'badge-muted',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn('badge', variants[variant], className)}>{children}</span>
}
