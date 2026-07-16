import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | undefined): string {
  if (!date) return '—'
  return format(parseISO(date), 'dd MMM yyyy', { locale: es })
}

export function formatDateTime(date: string | undefined): string {
  if (!date) return '—'
  return format(parseISO(date), "dd MMM yyyy, HH:mm", { locale: es })
}

export function formatRelative(date: string | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: es })
}

export function isOverdue(date: string | undefined): boolean {
  if (!date) return false
  return isPast(parseISO(date))
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
