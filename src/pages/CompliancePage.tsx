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
  const [trainingOpen, setTrainingOpen] = useState(false)
  const [trainTitle, setTrainTitle] = useState('')
  const [trainDate, setTrainDate] = useState(new Date().toISOString().slice(0, 10))
  const [trainTopic, setTrainTopic] = useState('Capacitación PLD/FT')
  const [trainParticipants, setTrainParticipants] = useState('')
  const [manualTitle, setManualTitle] = useState('Manual PLD')
  const [manualVersion, setManualVersion] = useState('1.0')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    getComplianceOfficer().then(({ officer: o }) => {
      if (o) setOfficer(o)
    })
  }, [])

  const activeManual = manuals.find((m) => m.is_active)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Manual y capacitación PLD</h1>
          <p>Arts. 52–54 LFPIORPI — Oficial de cumplimiento, manual y formación</p>
        </div>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2>Oficial de cumplimiento</h2>
          <div className="form-stack">
            <Input label="Nombre" value={officer.name} onChange={(e) => setOfficer({ ...officer, name: e.target.value })} />
            <Input label="Email" value={officer.email} onChange={(e) => setOfficer({ ...officer, email: e.target.value })} />
            <Input label="RFC" value={officer.rfc ?? ''} onChange={(e) => setOfficer({ ...officer, rfc: e.target.value })} />
            <Input label="Fecha designación" type="date" value={officer.appointed_at ?? ''} onChange={(e) => setOfficer({ ...officer, appointed_at: e.target.value })} />
            <Button onClick={async () => { await saveComplianceOfficer(officer) }}>Guardar oficial</Button>
          </div>
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
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                await uploadComplianceManual(file, { title: manualTitle, version: manualVersion, effective_date: manualDate }, user?.id)
                refetchManuals()
                e.target.value = ''
              }}
            />
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
              await createTrainingSession({
                title: trainTitle,
                session_date: trainDate,
                topic: trainTopic,
                participants: trainParticipants,
              }, user?.id)
              setTrainingOpen(false)
              refetchSessions()
            }}>
              <Input label="Título" value={trainTitle} onChange={(e) => setTrainTitle(e.target.value)} required />
              <Input label="Fecha" type="date" value={trainDate} onChange={(e) => setTrainDate(e.target.value)} required />
              <Input label="Tema" value={trainTopic} onChange={(e) => setTrainTopic(e.target.value)} required />
              <Input label="Participantes" value={trainParticipants} onChange={(e) => setTrainParticipants(e.target.value)} />
              <Button type="submit">Guardar capacitación</Button>
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
