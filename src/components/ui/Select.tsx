import { type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export function Select({ label, children, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="form-field">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select id={selectId} className={cn('select', className)} {...props}>
        {children}
      </select>
    </div>
  )
}
