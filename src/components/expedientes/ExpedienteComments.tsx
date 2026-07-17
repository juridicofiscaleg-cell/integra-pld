import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { addExpedienteComment, deleteExpedienteComment } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useExpedienteComments } from '../../hooks/useData'
import { formatRelative } from '../../lib/utils'

interface ExpedienteCommentsProps {
  expedienteId: string
}

export function ExpedienteComments({ expedienteId }: ExpedienteCommentsProps) {
  const { user, profile } = useAuth()
  const { comments, loading, refetch } = useExpedienteComments(expedienteId)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function post(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    setError('')
    const result = await addExpedienteComment(expedienteId, body, user?.id)
    setPosting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setBody('')
    refetch()
  }

  return (
    <div className="exp-comments">
      <form onSubmit={post} className="exp-comment-form">
        <Input label="" placeholder="Comentario interno del equipo..." value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={posting}>{posting ? '...' : 'Comentar'}</Button>
        {error && <p className="form-error">{error}</p>}
      </form>
      {loading ? <p className="loading">...</p> : comments.length === 0 ? (
        <p className="empty-state">Sin comentarios</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="exp-comment">
            <strong>{c.profiles?.full_name ?? 'Equipo'}</strong>
            <span>{formatRelative(c.created_at)}</span>
            <p>{c.body}</p>
            {profile?.role !== 'asistente' && (
              <button type="button" className="timeline-action-muted" onClick={async () => { await deleteExpedienteComment(c.id); refetch() }}>
                Eliminar
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}
