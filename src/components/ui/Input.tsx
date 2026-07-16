import { type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="form-field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={cn('input', error && 'input-error', className)} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
