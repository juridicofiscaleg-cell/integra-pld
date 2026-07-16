import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { exportClientsCsv, exportExpedientesCsv, exportKycCsv } from '../lib/export'
import { useClients, useExpedientes, useKycRecords } from '../hooks/useData'

export function ReportsPage() {
  const { clients } = useClients()
  const { expedientes } = useExpedientes()
  const { records: kycRecords } = useKycRecords()

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reportes</h1>
          <p>Exporta datos de clientes, expedientes y KYC</p>
        </div>
      </header>

      <div className="reports-grid">
        <section className="card report-card">
          <FileSpreadsheet size={32} />
          <h2>Clientes</h2>
          <p>{clients.length} registros — incluye RFC, riesgo, actividad vulnerable</p>
          <Button onClick={() => exportClientsCsv(clients)} disabled={clients.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={32} />
          <h2>Expedientes</h2>
          <p>{expedientes.length} asuntos — tipo, estado, prioridad y etapa</p>
          <Button onClick={() => exportExpedientesCsv(expedientes)} disabled={expedientes.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>

        <section className="card report-card">
          <FileSpreadsheet size={32} />
          <h2>KYC / Debida diligencia</h2>
          <p>{kycRecords.length} registros — score, PEP, vencimientos</p>
          <Button onClick={() => exportKycCsv(kycRecords)} disabled={kycRecords.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        </section>
      </div>

      <section className="card">
        <h2>Resumen ejecutivo</h2>
        <div className="exec-summary">
          <div><span className="exec-value">{clients.length}</span><span>Clientes</span></div>
          <div><span className="exec-value">{expedientes.filter((e) => e.status === 'activo').length}</span><span>Expedientes activos</span></div>
          <div><span className="exec-value">{kycRecords.filter((k) => k.status === 'aprobado').length}</span><span>KYC aprobados</span></div>
          <div><span className="exec-value">{clients.filter((c) => c.vulnerable_activity).length}</span><span>Act. vulnerable</span></div>
          <div><span className="exec-value">{kycRecords.filter((k) => k.pep).length}</span><span>PEP</span></div>
        </div>
      </section>
    </div>
  )
}
