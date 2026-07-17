import { useState } from 'react'
import { Check, Circle, Clock, Lock, Pencil } from 'lucide-react'
import type { ExpedienteStage } from '../../lib/types'
import { cn, formatDate } from '../../lib/utils'

interface TimelineProps {
  stages: ExpedienteStage[]
  currentIndex: number
  onAdvance?: (stageIndex: number) => void
  onRevert?: (stageIndex: number) => void
  onEditNotes?: (stageId: string, notes: string) => void
  readonly?: boolean
}

const statusIcon = {
  pendiente: Circle,
  en_progreso: Clock,
  completada: Check,
  bloqueada: Lock,
}

export function Timeline({ stages, currentIndex, onAdvance, onRevert, onEditNotes, readonly }: TimelineProps) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  const lastCompletedIndex = stages.reduce(
    (acc, s, i) => (s.status === 'completada' ? i : acc),
    -1,
  )

  function startEditNotes(stage: ExpedienteStage) {
    setEditingNotesId(stage.id)
    setNotesDraft(stage.notes ?? '')
  }

  async function saveNotes(stageId: string) {
    await onEditNotes?.(stageId, notesDraft)
    setEditingNotesId(null)
  }

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
              {editingNotesId === stage.id ? (
                <div className="timeline-notes-edit">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    placeholder="Notas de la etapa..."
                  />
                  <div className="form-actions">
                    <button type="button" className="timeline-action" onClick={() => setEditingNotesId(null)}>Cancelar</button>
                    <button type="button" className="timeline-action" onClick={() => saveNotes(stage.id)}>Guardar notas</button>
                  </div>
                </div>
              ) : (
                <>
                  {stage.notes && <p className="timeline-notes">{stage.notes}</p>}
                  {!readonly && onEditNotes && (
                    <button type="button" className="timeline-action timeline-action-muted" onClick={() => startEditNotes(stage)}>
                      <Pencil size={12} /> {stage.notes ? 'Editar notas' : 'Agregar notas'}
                    </button>
                  )}
                </>
              )}
              <div className="timeline-dates">
                {stage.started_at && <span>Inicio: {formatDate(stage.started_at)}</span>}
                {stage.completed_at && <span>Completada: {formatDate(stage.completed_at)}</span>}
              </div>
              {!readonly && stage.status === 'en_progreso' && onAdvance && (
                <button className="timeline-action" onClick={() => onAdvance(stage.stage_index)}>
                  Marcar como completada →
                </button>
              )}
              {!readonly && isDone && onRevert && i === lastCompletedIndex && (
                <button className="timeline-action timeline-action-revert" onClick={() => onRevert(stage.stage_index)}>
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
