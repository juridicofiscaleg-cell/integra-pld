import { useEffect, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  createTrainingSession,
  getComplianceManualUrl,
  getComplianceOfficer,
  saveComplianceOfficer,
  uploadComplianceManual,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useComplianceManuals, useTrainingSessions } from '../hooks/useData'
import type { ComplianceOfficer } from '../lib/types'
import { formatDate } from '../lib/utils'

export function CompliancePage() {
  const { user } = useAuth()
  const { manuals, refetch: refetchManuals } = useComplianceManuals()
  const { sessions, refetch: refetchSessions } = useTrainingSessions()
  const [officer, setOfficer] = useState<ComplianceOfficer>({ name: '', email: '' })
  const [officerSaving, setOfficerSaving] = useState(false)
  const [officerError, setOfficerError] = useState('')
  const [officerSuccess, setOfficerSuccess] = useState('')
  const [pageError, setPageError] = useState('')
  const [trainingOpen, setTrainingOpen] = useState(false)
  const [trainTitle, setTrainTitle] = useState('')
  const [trainDate, setTrainDate] = useState(new Date().toISOString().slice(0, 10))
  const [trainTopic, setTrainTopic] = useState('Capacitación PLD/FT')
  const [trainParticipants, setTrainParticipants] = useState('')
  const [trainError, setTrainError] = useState('')
  const [trainSaving, setTrainSaving] = useState(false)
  const [manualTitle, setManualTitle] = useState('Manual PLD')
  const [manualVersion, setManualVersion] = useState('1.0')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualError, setManualError] = useState('')
  const [manualUploading, setManualUploading] = useState(false)

  useEffect(() => {
    getComplianceOfficer().then(({ officer: o, error }) => {
      if (o) setOfficer(o)
      if (error) setPageError(error)
    })
  }, [])

  async function handleSaveOfficer(e: React.FormEvent) {
    e.preventDefault()
    if (!officer.name.trim()) {
      setOfficerError('El nombre del oficial es obligatorio.')
      setOfficerSuccess('')
      return
    }
    setOfficerSaving(true)
    setOfficerError('')
    setOfficerSuccess('')
    const result = await saveComplianceOfficer(officer)
    setOfficerSaving(false)
    if (result.error) {
      setOfficerError(result.error)
      return
    }
    setOfficerSuccess('Oficial de cumplimiento guardado correctamente.')
  }

  const activeManual = manuals.find((m) => m.is_active)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Manual y capacitación PLD</h1>
          <p>Arts. 52–54 LFPIORPI — Oficial de cumplimiento, manual y formación</p>
        </div>
      </header>

      {pageError && <p className="form-error compliance-banner">{pageError}</p>}

      <div className="detail-grid">
        <section className="card">
          <h2>Oficial de cumplimiento</h2>
          <form className="form-stack" onSubmit={handleSaveOfficer}>
            <Input label="Nombre" value={officer.name} onChange={(e) => setOfficer({ ...officer, name: e.target.value })} required />
            <Input label="Email" type="email" value={officer.email} onChange={(e) => setOfficer({ ...officer, email: e.target.value })} />
            <Input label="RFC" value={officer.rfc ?? ''} onChange={(e) => setOfficer({ ...officer, rfc: e.target.value })} />
            <Input label="Fecha designación" type="date" value={officer.appointed_at ?? ''} onChange={(e) => setOfficer({ ...officer, appointed_at: e.target.value })} />
            {officerError && <p className="form-error">{officerError}</p>}
            {officerSuccess && <p className="form-success">{officerSuccess}</p>}
            <Button type="submit" disabled={officerSaving}>
              {officerSaving ? 'Guardando...' : 'Guardar oficial'}
            </Button>
          </form>
        </section>

        <section className="card">
          <h2>Manual PLD vigente</h2>
          {activeManual ? (
            <div>
              <p><strong>{activeManual.title}</strong> v{activeManual.version}</p>
              <p>Vigente desde {formatDate(activeManual.effective_date)}</p>
              {activeManual.storage_path && (
                <Button variant="secondary" onClick={async () => {
                  const url = await getComplianceManualUrl(activeManual.storage_path!)
                  if (url) window.open(url, '_blank')
                }}>
                  <Download size={16} /> Descargar
                </Button>
              )}
            </div>
          ) : (
            <p className="empty-state">Sin manual cargado</p>
          )}
          <div className="form-stack" style={{ marginTop: '1rem' }}>
            <Input label="Título" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
            <Input label="Versión" value={manualVersion} onChange={(e) => setManualVersion(e.target.value)} />
            <Input label="Vigencia desde" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={manualUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setManualError('')
                setManualUploading(true)
                const result = await uploadComplianceManual(
                  file,
                  { title: manualTitle, version: manualVersion, effective_date: manualDate },
                  user?.id,
                )
                setManualUploading(false)
                if (result.error) {
                  setManualError(result.error)
                } else {
                  refetchManuals()
                }
                e.target.value = ''
              }}
            />
            {manualUploading && <p className="card-desc">Subiendo manual...</p>}
            {manualError && <p className="form-error">{manualError}</p>}
            <p className="card-desc">Subir nueva versión desactiva la anterior automáticamente.</p>
          </div>
        </section>

        <section className="card card-wide">
          <div className="client-ops-header">
            <h2>Capacitaciones ({sessions.length})</h2>
            <Button variant="secondary" onClick={() => setTrainingOpen(!trainingOpen)}><Plus size={14} /> Registrar</Button>
          </div>
          {trainingOpen && (
            <form className="form-stack" onSubmit={async (e) => {
              e.preventDefault()
              setTrainError('')
              setTrainSaving(true)
              const result = await createTrainingSession({
                title: trainTitle,
                session_date: trainDate,
                topic: trainTopic,
                participants: trainParticipants,
              }, user?.id)
              setTrainSaving(false)
              if (result.error) {
                setTrainError(result.error)
                return
              }
              setTrainingOpen(false)
              setTrainTitle('')
              refetchSessions()
            }}>
              <Input label="Título" value={trainTitle} onChange={(e) => setTrainTitle(e.target.value)} required />
              <Input label="Fecha" type="date" value={trainDate} onChange={(e) => setTrainDate(e.target.value)} required />
              <Input label="Tema" value={trainTopic} onChange={(e) => setTrainTopic(e.target.value)} required />
              <Input label="Participantes" value={trainParticipants} onChange={(e) => setTrainParticipants(e.target.value)} />
              {trainError && <p className="form-error">{trainError}</p>}
              <Button type="submit" disabled={trainSaving}>
                {trainSaving ? 'Guardando...' : 'Guardar capacitación'}
              </Button>
            </form>
          )}
          {sessions.length === 0 ? (
            <p className="empty-state">Sin capacitaciones registradas</p>
          ) : (
            <div className="mini-list">
              {sessions.map((s) => (
                <div key={s.id} className="mini-list-item">
                  <strong>{s.title}</strong>
                  <span>{s.topic} · {formatDate(s.session_date)}</span>
                  {s.participants && <span>{s.participants}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
