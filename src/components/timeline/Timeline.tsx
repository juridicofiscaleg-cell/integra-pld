import { Check, Circle, Clock, Lock } from 'lucide-react'
import type { ExpedienteStage } from '../../lib/types'
import { cn } from '../../lib/utils'
import { formatDate } from '../../lib/utils'

interface TimelineProps {
  stages: ExpedienteStage[]
  currentIndex: number
  onAdvance?: (stageIndex: number) => void
  onRevert?: (stageIndex: number) => void
  readonly?: boolean
}

const statusIcon = {
  pendiente: Circle,
  en_progreso: Clock,
  completada: Check,
  bloqueada: Lock,
}

export function Timeline({ stages, currentIndex, onAdvance, onRevert, readonly }: TimelineProps) {
  const lastCompletedIndex = stages.reduce(
    (acc, s, i) => (s.status === 'completada' ? i : acc),
    -1,
  )

  return (
    <div className="timeline">
      {stages.map((stage, i) => {
        const Icon = statusIcon[stage.status]
        const isCurrent = i === currentIndex
        const isDone = stage.status === 'completada'

        return (
          <div
            key={stage.id}
            className={cn(
              'timeline-item',
              isCurrent && 'timeline-item-current',
              isDone && 'timeline-item-done',
              stage.status === 'bloqueada' && 'timeline-item-blocked',
            )}
          >
            <div className="timeline-marker">
              <Icon size={16} />
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h4>{stage.name}</h4>
                <span className={`timeline-status status-${stage.status}`}>
                  {stage.status.replace('_', ' ')}
                </span>
              </div>
              {stage.notes && <p className="timeline-notes">{stage.notes}</p>}
              <div className="timeline-dates">
                {stage.started_at && <span>Inicio: {formatDate(stage.started_at)}</span>}
                {stage.completed_at && <span>Completada: {formatDate(stage.completed_at)}</span>}
              </div>
              {!readonly && stage.status === 'en_progreso' && onAdvance && (
                <button
                  className="timeline-action"
                  onClick={() => onAdvance(stage.stage_index)}
                >
                  Marcar como completada →
                </button>
              )}
              {!readonly && isDone && onRevert && i === lastCompletedIndex && (
                <button
                  className="timeline-action timeline-action-revert"
                  onClick={() => onRevert(stage.stage_index)}
                >
                  ← Deshacer completado
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
