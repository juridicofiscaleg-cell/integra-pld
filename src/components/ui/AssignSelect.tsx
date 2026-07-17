import { Select } from './Select'
import type { Profile } from '../../lib/types'

interface AssignSelectProps {
  label?: string
  value: string
  onChange: (userId: string) => void
  profiles: Profile[]
  allowEmpty?: boolean
}

export function AssignSelect({
  label = 'Responsable',
  value,
  onChange,
  profiles,
  allowEmpty = true,
}: AssignSelectProps) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">Sin asignar</option>}
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
      ))}
    </Select>
  )
}
