import { Input } from './Input'
import { Select } from './Select'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  filters?: {
    label: string
    value: string
    options: FilterOption[]
    onChange: (v: string) => void
  }[]
}

export function FilterBar({ search, onSearchChange, searchPlaceholder = 'Buscar...', filters = [] }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <Input
        label=""
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {filters.map((f) => (
        <Select key={f.label} label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      ))}
    </div>
  )
}
