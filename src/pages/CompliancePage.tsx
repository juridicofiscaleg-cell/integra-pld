import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, GraduationCap, Plus, Shield } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { Input } from '../components/ui/Input'
import { ComplianceOfficersSection } from '../components/compliance/ComplianceOfficersSection'
import { TrainingDetailModal } from '../components/compliance/TrainingDetailModal'
import { TrainingFormModal } from '../components/compliance/TrainingFormModal'
import { getComplianceManualUrl, uploadComplianceManual } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useClients, useComplianceManuals, useComplianceOfficers, useTrainingSessions } from '../hooks/useData'
import { exportTrainingsCsv } from '../lib/export'
import type { TrainingSession } from '../lib/types'
import { formatDate } from '../lib/utils'
import { parseParticipants } from '../lib/certificate-template'

export function CompliancePage() {
  const { user, profile } = useAuth()
  const { clients } = useClients()
  const { manuals, refetch: refetchManuals } = useComplianceManuals()
  const { officers, loading: officersLoading, refetch: refetchOfficers, error: officersError } = useComplianceOfficers()
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useTrainingSessions()
  const [officersPageError, setOfficersPageError] = useState('')
  const [manualTitle, setManualTitle] = useState('Manual PLD')
  const [manualVersion, setManualVersion] = useState('1.0')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualError, setManualError] = useState('')
  const [manualUploading, setManualUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSession, setEditSession] = useState<TrainingSession | null>(null)
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null)

  const canDelete = profile?.role !== 'asistente'
  const activeManual = manuals.find((m) => m.is_active)
  const currentYear = new Date().getFullYear()
  const sessionsThisYear = sessions.filter((s) => s.session_date.startsWith(String(currentYear)))
  const activeOfficers = officers.filter((o) => o.is_active)

  useEffect(() => {
    if (officersError) setOfficersPageError(officersError)
  }, [officersError])

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

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = search.toLowerCase()
      const clientName = s.clients?.name ?? clients.find((c) => c.id === s.client_id)?.name ?? ''
      const haystack = [s.title, s.topic, s.participants, s.instructor, clientName].join(' ').toLowerCase()
      if (search && !haystack.includes(q)) return false
      if (yearFilter && !s.session_date.startsWith(yearFilter)) return false
      if (clientFilter && s.client_id !== clientFilter) return false
      return true
    })
  }, [sessions, search, yearFilter, clientFilter, clients])

  function openCreateTraining() {
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
          <p>Registro de oficiales por cliente, capacitaciones, diplomas y manual — Arts. 52–54 LFPIORPI</p>
        </div>
      </header>

      <div className="compliance-stats">
        <div className="stat-chip">
          <Shield size={18} />
          <span>{activeOfficers.length} oficial(es) vigente(s)</span>
        </div>
        <div className="stat-chip">
          <GraduationCap size={18} />
          <span>{sessionsThisYear.length} capacitación(es) en {currentYear}</span>
        </div>
        <div className="stat-chip">
          <span>Manual: {activeManual ? `v${activeManual.version}` : 'pendiente'}</span>
        </div>
      </div>

      <ComplianceOfficersSection
        officers={officers}
        clients={clients}
        loading={officersLoading}
        canDelete={canDelete}
        userId={user?.id}
        onRefetch={refetchOfficers}
        pageError={officersPageError}
      />

      <section className="card card-wide">
        <div className="client-ops-header">
          <div>
            <h2>Historial de capacitaciones</h2>
            <p className="card-desc">{filteredSessions.length} registro(s) · vinculadas a clientes · Art. 54</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" onClick={() => exportTrainingsCsv(sessions, clients)} disabled={sessions.length === 0}>
              <Download size={14} /> Export CSV
            </Button>
            <Button onClick={openCreateTraining}><Plus size={14} /> Nueva capacitación</Button>
          </div>
        </div>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar capacitación, cliente, instructor..."
          filters={[
            {
              label: 'Año',
              value: yearFilter,
              onChange: setYearFilter,
              options: [{ value: '', label: 'Todos' }, ...years.map((y) => ({ value: y, label: y }))],
            },
            {
              label: 'Cliente',
              value: clientFilter,
              onChange: setClientFilter,
              options: [
                { value: '', label: 'Todos' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ],
            },
          ]}
        />

        {sessionsLoading ? (
          <p className="loading">Cargando capacitaciones...</p>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            <h3>Sin capacitaciones registradas</h3>
            <p>Registra cada sesión formativa por cliente para acreditar el cumplimiento del Art. 54.</p>
            <Button onClick={openCreateTraining}><Plus size={16} /> Registrar capacitación</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Capacitación</th>
                  <th>Tema</th>
                  <th>Participantes</th>
                  <th>Diploma</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  const count = parseParticipants(s.participants).length
                  const clientName = s.clients?.name ?? clients.find((c) => c.id === s.client_id)?.name
                  return (
                    <tr key={s.id} className="clickable-row" onClick={() => setDetailSession(s)}>
                      <td>{formatDate(s.session_date)}</td>
                      <td>
                        {s.client_id ? (
                          <Link to={`/clientes/${s.client_id}`} onClick={(e) => e.stopPropagation()}>
                            {clientName ?? '—'}
                          </Link>
                        ) : '—'}
                      </td>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.topic}</td>
                      <td>{count > 0 ? count : '—'}</td>
                      <td>
                        {s.certificate_text
                          ? <Badge variant="success">Generado</Badge>
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

      <section className="card">
        <h2>Manual PLD (despacho)</h2>
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

      <TrainingFormModal
        open={formOpen}
        session={editSession}
        clients={clients}
        officers={officers}
        onClose={() => { setFormOpen(false); setEditSession(null) }}
        onSaved={handleSaved}
        userId={user?.id}
      />

      <TrainingDetailModal
        session={detailSession}
        clients={clients}
        officers={officers}
        canDelete={canDelete}
        onClose={() => setDetailSession(null)}
        onEdit={(s) => { setDetailSession(null); setEditSession(s); setFormOpen(true) }}
        onUpdated={refetchSessions}
        onDeleted={refetchSessions}
      />
    </div>
  )
}
