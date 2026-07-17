import { Input } from '../ui/Input'
import type { PepQuestionnaire } from '../../lib/types'

interface PepQuestionnairePanelProps {
  value: PepQuestionnaire
  onChange: (v: PepQuestionnaire) => void
}

export function PepQuestionnairePanel({ value, onChange }: PepQuestionnairePanelProps) {
  function set<K extends keyof PepQuestionnaire>(key: K, val: PepQuestionnaire[K]) {
    onChange({ ...value, [key]: val, last_updated: new Date().toISOString() })
  }

  return (
    <div className="pep-questionnaire">
      <strong>Cuestionario PEP</strong>
      <label className="checkbox-row">
        <input type="checkbox" checked={value.is_pep} onChange={(e) => set('is_pep', e.target.checked)} />
        El cliente es Persona Políticamente Expuesta (PEP)
      </label>
      {value.is_pep && (
        <>
          <Input label="Cargo / posición" value={value.position ?? ''} onChange={(e) => set('position', e.target.value)} />
          <Input label="Institución" value={value.institution ?? ''} onChange={(e) => set('institution', e.target.value)} />
          <Input label="País" value={value.country ?? 'México'} onChange={(e) => set('country', e.target.value)} />
        </>
      )}
      <label className="checkbox-row">
        <input type="checkbox" checked={!!value.family_pep} onChange={(e) => set('family_pep', e.target.checked)} />
        Familiar directo de PEP
      </label>
      {value.family_pep && (
        <Input label="Parentesco" value={value.family_relation ?? ''} onChange={(e) => set('family_relation', e.target.value)} />
      )}
      <label className="checkbox-row">
        <input type="checkbox" checked={!!value.close_associate} onChange={(e) => set('close_associate', e.target.checked)} />
        Asociado cercano de PEP
      </label>
      {value.close_associate && (
        <Input label="Detalle asociación" value={value.associate_details ?? ''} onChange={(e) => set('associate_details', e.target.value)} />
      )}
    </div>
  )
}
