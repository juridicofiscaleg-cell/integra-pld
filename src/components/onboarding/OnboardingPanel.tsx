import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'
import type { OnboardingState } from '../../lib/types'

interface OnboardingPanelProps {
  state: OnboardingState
  onDismiss?: () => void
}

const STEPS: { key: keyof OnboardingState['steps']; label: string; to: string }[] = [
  { key: 'firm_profile', label: 'Datos del despacho', to: '/configuracion' },
  { key: 'team_member', label: 'Invitar auxiliar (asignar rol)', to: '/configuracion' },
  { key: 'first_client', label: 'Registrar primer cliente', to: '/clientes' },
  { key: 'first_officer', label: 'Designar oficial de cumplimiento', to: '/cumplimiento' },
  { key: 'first_manual', label: 'Subir manual PLD', to: '/cumplimiento' },
]

export function OnboardingPanel({ state, onDismiss }: OnboardingPanelProps) {
  if (state.completed) return null

  return (
    <section className="card onboarding-panel">
      <div className="client-ops-header">
        <div>
          <h2>Configura tu despacho</h2>
          <p className="card-desc">Completa estos pasos para operar con confianza en PLD.</p>
        </div>
        {onDismiss && (
          <Button variant="secondary" size="sm" onClick={onDismiss}>Ocultar</Button>
        )}
      </div>
      <ul className="onboarding-steps">
        {STEPS.map(({ key, label, to }) => {
          const done = state.steps[key]
          return (
            <li key={key} className={done ? 'done' : ''}>
              <CheckCircle2 size={16} />
              {done ? <span>{label}</span> : <Link to={to}>{label}</Link>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
