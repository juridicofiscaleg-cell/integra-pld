import { useEffect, useMemo, useState } from 'react'
import { Download, GraduationCap, Plus, Shield } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { Input } from '../components/ui/Input'
import { FirmProfileCard } from '../components/compliance/FirmProfileCard'
import { OfficerProfileCard } from '../components/compliance/OfficerProfileCard'
import { TrainingDetailModal } from '../components/compliance/TrainingDetailModal'
import { TrainingFormModal } from '../components/compliance/TrainingFormModal'
import {
  getComplianceManualUrl,
  getComplianceOfficer,
  getFirmProfile,
  uploadComplianceManual,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useComplianceManuals, useTrainingSessions } from '../hooks/useData'
import { exportTrainingsCsv } from '../lib/export'
import type { ComplianceOfficer, FirmProfile, TrainingSession } from '../lib/types'
import { TRAINING_MODALITY_LABELS } from '../lib/types'
import { formatDate } from '../lib/utils'
import { parseParticipants } from '../lib/certificate-template'

export function CompliancePage() {
  const { user, profile } = useAuth()
  const { manuals, refetch: refetchManuals } = useComplianceManuals()
  const { sessions, loading, refetch: refetchSessions } = useTrainingSessions()
  const [officer, setOfficer] = useState<ComplianceOfficer>({ name: '', email: '' })
  const [officerUpdatedAt, setOfficerUpdatedAt] = useState<string>()
  const [firm, setFirm] = useState<FirmProfile>({ name: '' })
  const [pageError, setPageError] = useState('')
  const [manualTitle, setManualTitle] = useState('Manual PLD')
  const [manualVersion, setManualVersion] = useState('1.0')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualError, setManualError] = useState('')
  const [manualUploading, setManualUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSession, setEditSession] = useState<TrainingSession | null>(null)
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null)

  const canDelete = profile?.role !== 'asistente'
  const activeManual = manuals.find((m) => m.is_active)
  const currentYear = new Date().getFullYear()
  const sessionsThisYear = sessions.filter((s) => s.session_date.startsWith(String(currentYear)))

  useEffect(() => {
    getComplianceOfficer().then(({ officer: o, updatedAt, error }) => {
      if (o) setOfficer(o)
      if (updatedAt) setOfficerUpdatedAt(updatedAt)
      if (error) setPageError(error)
    })
    getFirmProfile().then(({ firm: f }) => {
      if (f) setFirm(f)
    })
  }, [])

  useEffect(() => {
    if (detailSession) {
      const fresh = sessions.find((s) => s.id === detailSession.id)
      if (fresh) setDetailSession(fresh)
    }
  }, [sessions, detailSession?.id])

  const years = useMemo(() => {
    const set = new Set(sessions.map((s) => s.session_date.slice(0, 4)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [sessions])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const q = search.toLowerCase()
      const haystack = [s.title, s.topic, s.participants, s.instructor].join(' ').toLowerCase()
      if (search && !haystack.includes(q)) return false
      if (yearFilter && !s.session_date.startsWith(yearFilter)) return false
      return true
    })
  }, [sessions, search, yearFilter])

  function openCreate() {
    setEditSession(null)
    setFormOpen(true)
  }

  async function handleSaved(id?: string) {
    const list = await refetchSessions()
    if (id) {
      const created = list.find((s) => s.id === id)
      if (created) setDetailSession(created)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Cumplimiento PLD</h1>
          <p>Oficial de cumplimiento, manual, capacitaciones y constancias — Arts. 52–54 LFPIORPI</p>
        </div>
      </header>

      {pageError && <p className="form-error compliance-banner">{pageError}</p>}

      <div className="compliance-stats">
        <div className="stat-chip">
          <Shield size={18} />
          <span>{officer.name?.trim() ? 'Oficial designado' : 'Sin oficial'}</span>
        </div>
        <div className="stat-chip">
          <GraduationCap size={18} />
          <span>{sessionsThisYear.length} capacitación(es) en {currentYear}</span>
        </div>
        <div className="stat-chip">
          <span>Manual: {activeManual ? `v${activeManual.version}` : 'pendiente'}</span>
        </div>
      </div>

      <div className="detail-grid compliance-top-grid">
        <OfficerProfileCard
          officer={officer}
          savedAt={officerUpdatedAt}
          onUpdated={(o) => {
            setOfficer(o)
            setOfficerUpdatedAt(new Date().toISOString())
          }}
        />
        <FirmProfileCard firm={firm} onUpdated={setFirm} />
      </div>

      <section className="card">
        <h2>Manual PLD</h2>
        {activeManual ? (
          <div className="manual-active">
            <div>
              <strong>{activeManual.title}</strong> · versión {activeManual.version}
              <p className="card-desc">Vigente desde {formatDate(activeManual.effective_date)}</p>
            </div>
            {activeManual.storage_path && (
              <Button variant="secondary" onClick={async () => {
                const url = await getComplianceManualUrl(activeManual.storage_path!)
                if (url) window.open(url, '_blank')
              }}>
                <Download size={16} /> Descargar vigente
              </Button>
            )}
          </div>
        ) : (
          <p className="empty-state compact">Sin manual cargado</p>
        )}

        {manuals.length > 1 && (
          <div className="manual-history">
            <h3>Historial de versiones</h3>
            <div className="mini-list">
              {manuals.filter((m) => !m.is_active).map((m) => (
                <div key={m.id} className="mini-list-item">
                  <strong>{m.title}</strong>
                  <span>v{m.version} · {formatDate(m.effective_date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-stack manual-upload">
          <h3>Subir nueva versión</h3>
          <div className="form-row">
            <Input label="Título" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
            <Input label="Versión" value={manualVersion} onChange={(e) => setManualVersion(e.target.value)} />
            <Input label="Vigencia desde" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
          </div>
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
              if (result.error) setManualError(result.error)
              else refetchManuals()
              e.target.value = ''
            }}
          />
          {manualUploading && <p className="card-desc">Subiendo manual...</p>}
          {manualError && <p className="form-error">{manualError}</p>}
        </div>
      </section>

      <section className="card card-wide">
        <div className="client-ops-header">
          <div>
            <h2>Historial de capacitaciones</h2>
            <p className="card-desc">{filtered.length} registro(s) · base de cumplimiento Art. 54</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" onClick={() => exportTrainingsCsv(sessions)} disabled={sessions.length === 0}>
              <Download size={14} /> Export CSV
            </Button>
            <Button onClick={openCreate}><Plus size={14} /> Nueva capacitación</Button>
          </div>
        </div>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por título, tema, instructor o participante..."
          filters={[
            {
              label: 'Año',
              value: yearFilter,
              onChange: setYearFilter,
              options: [{ value: '', label: 'Todos' }, ...years.map((y) => ({ value: y, label: y }))],
            },
          ]}
        />

        {loading ? (
          <p className="loading">Cargando capacitaciones...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>Sin capacitaciones registradas</h3>
            <p>Registra cada sesión formativa para acreditar el cumplimiento del Art. 54 LFPIORPI.</p>
            <Button onClick={openCreate}><Plus size={16} /> Registrar primera capacitación</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Capacitación</th>
                  <th>Tema</th>
                  <th>Participantes</th>
                  <th>Modalidad</th>
                  <th>Constancia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const count = parseParticipants(s.participants).length
                  return (
                    <tr key={s.id} className="clickable-row" onClick={() => setDetailSession(s)}>
                      <td>{formatDate(s.session_date)}</td>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.topic}</td>
                      <td>{count > 0 ? count : '—'}</td>
                      <td>{s.modality ? TRAINING_MODALITY_LABELS[s.modality as keyof typeof TRAINING_MODALITY_LABELS] ?? s.modality : '—'}</td>
                      <td>
                        {s.certificate_text
                          ? <Badge variant="success">Generada</Badge>
                          : <Badge variant="warning">Pendiente</Badge>}
                      </td>
                      <td><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetailSession(s) }}>Ver ficha</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TrainingFormModal
        open={formOpen}
        session={editSession}
        onClose={() => { setFormOpen(false); setEditSession(null) }}
        onSaved={handleSaved}
        userId={user?.id}
      />

      <TrainingDetailModal
        session={detailSession}
        officer={officer}
        firm={firm}
        canDelete={canDelete}
        onClose={() => setDetailSession(null)}
        onEdit={(s) => { setDetailSession(null); setEditSession(s); setFormOpen(true) }}
        onUpdated={refetchSessions}
        onDeleted={refetchSessions}
      />
    </div>
  )
}
