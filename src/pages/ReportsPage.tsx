import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import {
  exportActivityCsv,
  exportClientsCsv,
  exportExpedientesCsv,
  exportKycCsv,
  exportManualsCsv,
  exportNoticesCsv,
  exportOfficersCsv,
  exportOperationsCsv,
  exportTrainingsCsv,
  filterByDateRange,
  printReport,
} from '../lib/export'
import {
  useActivity,
  useClients,
  useComplianceManuals,
  useComplianceOfficers,
  useExpedientes,
  useKycRecords,
  usePldOperations,
  useTrainingSessions,
  useUnusualNotices,
} from '../hooks/useData'
import { effectiveRiskLevel } from '../lib/client-risk'
import { canViewReports } from '../lib/permissions'
import { useAuth } from '../context/AuthContext'
import { KYC_STATUS_LABELS, RISK_LABELS, STATUS_LABELS } from '../lib/types'

export function ReportsPage() {
  const { profile } = useAuth()
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords } = useKycRecords()
  const { activity } = useActivity()
  const { operations } = usePldOperations()
  const { notices } = useUnusualNotices()
  const { officers } = useComplianceOfficers()
  const { manuals } = useComplianceManuals()
  const { sessions: trainings } = useTrainingSessions()
  const [riskFilter, setRiskFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredClients = riskFilter
    ? clients.filter((c) => effectiveRiskLevel(c) === riskFilter)
    : clients

  const filteredExpedientes = statusFilter
    ? expedientes.filter((e) => e.status === statusFilter)
    : expedientes

  const filteredOps = useMemo(
    () => filterByDateRange(operations, 'operation_date', dateFrom, dateTo),
    [operations, dateFrom, dateTo],
  )
  const filteredNotices = useMemo(
    () => filterByDateRange(notices, 'detected_at', dateFrom, dateTo),
    [notices, dateFrom, dateTo],
  )
  const filteredTrainings = useMemo(
    () => filterByDateRange(trainings, 'session_date', dateFrom, dateTo),
    [trainings, dateFrom, dateTo],
  )
  const filteredActivity = useMemo(
    () => filterByDateRange(activity, 'created_at', dateFrom, dateTo),
    [activity, dateFrom, dateTo],
  )

  const stats = {
    totalClients: clients.length,
    vulnerable: clients.filter((c) => c.vulnerable_activity).length,
    highRisk: clients.filter((c) => {
      const r = effectiveRiskLevel(c)
      return r === 'alto' || r === 'critico'
    }).length,
    activeExp: expedientes.filter((e) => e.status === 'activo').length,
    kycPending: kycRecords.filter((k) => k.status === 'pendiente' || k.status === 'en_revision').length,
    kycExpired: kycRecords.filter((k) => k.status === 'vencido').length,
    pep: kycRecords.filter((k) => k.pep).length,
    opsUnreported: operations.filter((o) => o.unusual && !o.reported).length,
    noticesDraft: notices.filter((n) => n.status === 'borrador').length,
    officersActive: officers.filter((o) => o.is_active).length,
    manualsActive: manuals.filter((m) => m.is_active).length,
    trainingsYear: trainings.filter((t) => t.session_date.startsWith(String(new Date().getFullYear()))).length,
  }

  if (!canViewReports(profile?.role)) return <Navigate to="/" replace />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reportes y cumplimiento</h1>
          <p>Exportaciones, bitácora de auditoría y métricas PLD</p>
        </div>
        <Button variant="secondary" onClick={() => printReport(stats, clients, expedientes, kycRecords)}>
          <Printer size={16} /> Imprimir resumen
        </Button>
      </header>

      <section className="card">
        <h2>Filtro por fechas (operaciones, avisos, capacitaciones, bitácora)</h2>
        <div className="form-row">
          <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </section>

      <section className="card">
        <h2>Panel de cumplimiento</h2>
        <div className="exec-summary">
          <div><span className="exec-value">{stats.totalClients}</span><span>Clientes</span></div>
          <div><span className="exec-value">{stats.vulnerable}</span><span>Act. vulnerable</span></div>
          <div><span className="exec-value">{stats.highRisk}</span><span>Riesgo alto/crítico</span></div>
          <div><span className="exec-value">{stats.activeExp}</span><span>Expedientes activos</span></div>
          <div><span className="exec-value">{stats.kycPending}</span><span>KYC pendientes</span></div>
          <div><span className="exec-value">{stats.kycExpired}</span><span>KYC vencidos</span></div>
          <div><span className="exec-value">{stats.pep}</span><span>PEP</span></div>
          <div><span className="exec-value">{stats.opsUnreported}</span><span>Ops. sin reportar</span></div>
          <div><span className="exec-value">{stats.noticesDraft}</span><span>Avisos borrador</span></div>
          <div><span className="exec-value">{stats.officersActive}</span><span>Oficiales vigentes</span></div>
          <div><span className="exec-value">{stats.manualsActive}</span><span>Manuales vigentes</span></div>
          <div><span className="exec-value">{stats.trainingsYear}</span><span>Capacitaciones {new Date().getFullYear()}</span></div>
        </div>
      </section>

      <div className="reports-grid">
        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Clientes</h2>
          <Select label="Filtrar por riesgo" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.keys(RISK_LABELS).map((k) => (
              <option key={k} value={k}>{RISK_LABELS[k as keyof typeof RISK_LABELS]}</option>
            ))}
          </Select>
          <p>{filteredClients.length} registros</p>
          <Button onClick={() => exportClientsCsv(filteredClients)} disabled={filteredClients.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Expedientes</h2>
          <Select label="Filtrar por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.keys(STATUS_LABELS).map((k) => (
              <option key={k} value={k}>{STATUS_LABELS[k as keyof typeof STATUS_LABELS]}</option>
            ))}
          </Select>
          <p>{filteredExpedientes.length} registros</p>
          <Button onClick={() => exportExpedientesCsv(filteredExpedientes)} disabled={filteredExpedientes.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>KYC</h2>
          <p>{kycRecords.length} registros — score, PEP, vencimientos</p>
          <Button onClick={() => exportKycCsv(kycRecords)} disabled={kycRecords.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Operaciones PLD</h2>
          <p>{filteredOps.length} registros{dateFrom || dateTo ? ' (filtrados)' : ''}</p>
          <Button onClick={() => exportOperationsCsv(filteredOps)} disabled={filteredOps.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Avisos Art. 21</h2>
          <p>{filteredNotices.length} avisos{dateFrom || dateTo ? ' (filtrados)' : ''}</p>
          <Button onClick={() => exportNoticesCsv(filteredNotices)} disabled={filteredNotices.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Oficiales de cumplimiento</h2>
          <p>{officers.length} registros</p>
          <Button onClick={() => exportOfficersCsv(officers)} disabled={officers.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Manuales PLD</h2>
          <p>{manuals.length} versiones</p>
          <Button onClick={() => exportManualsCsv(manuals)} disabled={manuals.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Capacitaciones</h2>
          <p>{filteredTrainings.length} registros{dateFrom || dateTo ? ' (filtrados)' : ''}</p>
          <Button onClick={() => exportTrainingsCsv(filteredTrainings, clients)} disabled={filteredTrainings.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={28} />
          <h2>Bitácora de auditoría</h2>
          <p>{filteredActivity.length} eventos{dateFrom || dateTo ? ' (filtrados)' : ''}</p>
          <Button onClick={() => exportActivityCsv(filteredActivity)} disabled={filteredActivity.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>
      </div>

      <section className="card">
        <h2>Resumen KYC por estado</h2>
        <div className="risk-summary">
          {Object.keys(KYC_STATUS_LABELS).map((status) => {
            const count = kycRecords.filter((k) => k.status === status).length
            return (
              <div key={status} className="risk-item">
                <Badge variant={status === 'aprobado' ? 'success' : status === 'rechazado' || status === 'vencido' ? 'danger' : 'warning'}>
                  {KYC_STATUS_LABELS[status as keyof typeof KYC_STATUS_LABELS]}
                </Badge>
                <span>{count}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
