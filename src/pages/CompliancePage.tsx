import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Download, GraduationCap, Plus, Shield } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { ClientManualsSection } from '../components/compliance/ClientManualsSection'
import { ComplianceOfficersSection } from '../components/compliance/ComplianceOfficersSection'
import { TrainingDetailModal } from '../components/compliance/TrainingDetailModal'
import { TrainingFormModal } from '../components/compliance/TrainingFormModal'
import { useAuth } from '../context/AuthContext'
import {
  useClients,
  useComplianceManuals,
  useComplianceOfficers,
  useTrainingSessions,
} from '../hooks/useData'
import { exportTrainingsCsv } from '../lib/export'
import type { TrainingSession } from '../lib/types'
import { formatDate } from '../lib/utils'
import { canDelete as roleCanDelete, canWrite } from '../lib/permissions'
import { parseParticipants } from '../lib/certificate-template'

export function CompliancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlClient = searchParams.get('cliente') ?? ''
  const urlAction = searchParams.get('accion') ?? ''
  const urlTraining = searchParams.get('capacitacion') ?? ''
  const { user, profile } = useAuth()
  const { clients } = useClients()
  const { manuals, loading: manualsLoading, error: manualsError, refetch: refetchManuals } = useComplianceManuals()
  const { officers, loading: officersLoading, error: officersError, refetch: refetchOfficers } = useComplianceOfficers()
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useTrainingSessions()
  const [migrationBanner, setMigrationBanner] = useState('')
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSession, setEditSession] = useState<TrainingSession | null>(null)
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null)
  const [prefillClientId, setPrefillClientId] = useState('')
  const [openOfficerForm, setOpenOfficerForm] = useState(false)
  const [openManualForm, setOpenManualForm] = useState(false)

  const canDelete = roleCanDelete(profile?.role)
  const canEdit = canWrite(profile?.role)
  const currentYear = new Date().getFullYear()
  const sessionsThisYear = sessions.filter((s) => s.session_date.startsWith(String(currentYear)))
  const activeOfficers = officers.filter((o) => o.is_active)
  const activeManuals = manuals.filter((m) => m.is_active)

  useEffect(() => {
    if (urlTraining && sessions.length) {
      const t = sessions.find((s) => s.id === urlTraining)
      if (t) setDetailSession(t)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('capacitacion')
        return next
      }, { replace: true })
    }
  }, [urlTraining, sessions, setSearchParams])

  useEffect(() => {
    if (!urlClient) return
    setPrefillClientId(urlClient)
    if (urlAction === 'capacitacion') {
      setEditSession(null)
      setFormOpen(true)
    }
    if (urlAction === 'oficial') setOpenOfficerForm(true)
    if (urlAction === 'manual') setOpenManualForm(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('cliente')
      next.delete('accion')
      return next
    }, { replace: true })
  }, [urlClient, urlAction, setSearchParams])

  useEffect(() => {
    const err = officersError || manualsError
    if (err && /migración|schema cache|could not find/i.test(err)) {
      setMigrationBanner(err)
    }
  }, [officersError, manualsError])

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
          <h1>Oficiales de cumplimiento</h1>
          <p>Registro por cliente: oficiales, manuales PLD, capacitaciones y diplomas — Arts. 52–54 LFPIORPI</p>
        </div>
      </header>

      {migrationBanner && (
        <div className="form-error compliance-banner">
          <strong>Configuración pendiente en Supabase</strong>
          <p>{migrationBanner}</p>
          <p className="card-desc">Archivo: <code>supabase/migration-cumplimiento.sql</code></p>
        </div>
      )}

      <div className="compliance-stats">
        <div className="stat-chip">
          <Shield size={18} />
          <span>{activeOfficers.length} oficial(es) vigente(s)</span>
        </div>
        <div className="stat-chip">
          <BookOpen size={18} />
          <span>{activeManuals.length} manual(es) vigente(s)</span>
        </div>
        <div className="stat-chip">
          <GraduationCap size={18} />
          <span>{sessionsThisYear.length} capacitación(es) en {currentYear}</span>
        </div>
      </div>

      <ComplianceOfficersSection
        officers={officers}
        clients={clients}
        loading={officersLoading}
        canDelete={canDelete}
        canEdit={canEdit}
        initialClientId={prefillClientId}
        openOfficerForm={openOfficerForm}
        onOfficerFormOpened={() => setOpenOfficerForm(false)}
        userId={user?.id}
        onRefetch={refetchOfficers}
        pageError={officersError && !migrationBanner ? officersError : undefined}
      />

      <ClientManualsSection
        manuals={manuals}
        clients={clients}
        loading={manualsLoading}
        canDelete={canDelete}
        canEdit={canEdit}
        initialClientId={prefillClientId}
        openUploadForm={openManualForm}
        onUploadFormOpened={() => setOpenManualForm(false)}
        userId={user?.id}
        onRefetch={refetchManuals}
        pageError={manualsError && !migrationBanner ? manualsError : undefined}
      />

      <section className="card card-wide">
        <div className="client-ops-header">
          <div>
            <h2>Capacitaciones</h2>
            <p className="card-desc">{filteredSessions.length} registro(s) · vinculadas a clientes · Art. 54</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" onClick={() => exportTrainingsCsv(sessions, clients)} disabled={sessions.length === 0}>
              <Download size={14} /> Export CSV
            </Button>
            {canEdit && (
              <Button onClick={() => { setEditSession(null); setFormOpen(true) }}>
                <Plus size={14} /> Nueva capacitación
              </Button>
            )}
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
              options: [{ value: '', label: 'Todos' }, ...clients.map((c) => ({ value: c.id, label: c.name }))],
            },
          ]}
        />

        {sessionsLoading ? (
          <p className="loading">Cargando capacitaciones...</p>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            <h3>Sin capacitaciones registradas</h3>
            <p>Registra cada sesión formativa por cliente para acreditar el cumplimiento del Art. 54.</p>
            <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Registrar capacitación</Button>
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
                      <td>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetailSession(s) }}>
                          Ver ficha
                        </Button>
                      </td>
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
        clients={clients}
        officers={officers}
        initialClientId={prefillClientId}
        onClose={() => { setFormOpen(false); setEditSession(null); setPrefillClientId('') }}
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
