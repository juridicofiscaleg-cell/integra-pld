import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { BeneficialOwner } from '../../lib/types'

interface BeneficialOwnersEditorProps {
  owners: BeneficialOwner[]
  onChange: (owners: BeneficialOwner[]) => void
}

function newOwner(): BeneficialOwner {
  return { id: crypto.randomUUID(), name: '', nationality: 'México', ownership_percent: 0, is_pep: false }
}

export function BeneficialOwnersEditor({ owners, onChange }: BeneficialOwnersEditorProps) {
  function update(id: string, patch: Partial<BeneficialOwner>) {
    onChange(owners.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  function remove(id: string) {
    onChange(owners.filter((o) => o.id !== id))
  }

  return (
    <div className="bc-editor">
      <div className="bc-header">
        <strong>Beneficiarios controladores</strong>
        <Button type="button" variant="secondary" onClick={() => onChange([...owners, newOwner()])}>
          <Plus size={14} /> Agregar
        </Button>
      </div>
      {owners.length === 0 ? (
        <p className="empty-state">Sin beneficiarios registrados</p>
      ) : (
        owners.map((o) => (
          <div key={o.id} className="bc-row">
            <Input label="Nombre" value={o.name} onChange={(e) => update(o.id, { name: e.target.value })} />
            <Input label="RFC" value={o.rfc ?? ''} onChange={(e) => update(o.id, { rfc: e.target.value })} />
            <Input label="Nacionalidad" value={o.nationality ?? ''} onChange={(e) => update(o.id, { nationality: e.target.value })} />
            <Input
              label="% participación"
              type="number"
              min={0}
              max={100}
              value={o.ownership_percent ?? 0}
              onChange={(e) => update(o.id, { ownership_percent: Number(e.target.value) })}
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={!!o.is_pep} onChange={(e) => update(o.id, { is_pep: e.target.checked })} />
              Es PEP
            </label>
            <button type="button" className="icon-btn danger" onClick={() => remove(o.id)} title="Eliminar">
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
