import { Link } from 'react-router-dom'
import { Download, GraduationCap, Plus, Shield, Upload } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getComplianceManualUrl } from '../../lib/api'
import type { ClientComplianceOfficer, ComplianceManual, TrainingSession, UserRole } from '../../lib/types'
import { formatDate } from '../../lib/utils'
import { canManageCompliance } from '../../lib/permissions'

interface ClientCompliancePanelProps {
  clientId: string
  officers: ClientComplianceOfficer[]
  manuals: ComplianceManual[]
  trainings: TrainingSession[]
  role?: UserRole
}

export function ClientCompliancePanel({ clientId, officers, manuals, trainings, role }: ClientCompliancePanelProps) {
  const canEdit = canManageCompliance(role)
  const officer = officers.find((o) => o.client_id === clientId && o.is_active)
  const pastOfficers = officers.filter((o) => o.client_id === clientId && !o.is_active)
  const manual = manuals.find((m) => m.client_id === clientId && m.is_active)
  const clientTrainings = trainings
    .filter((t) => t.client_id === clientId)
    .sort((a, b) => b.session_date.localeCompare(a.session_date))

  const q = `?cliente=${clientId}`

  return (
    <section className="card card-wide client-compliance-panel">
      <div className="client-ops-header">
        <h2>Cumplimiento PLD (Arts. 52–54)</h2>
        {canEdit && (
          <Link to={`/cumplimiento${q}`}>
            <Button variant="secondary" size="sm">Gestionar en módulo</Button>
          </Link>
        )}
      </div>

      <div className="client-compliance-grid">
        <div className="client-compliance-block">
          <h3><Shield size={16} /> Oficial de cumplimiento</h3>
          {officer ? (
            <>
              <strong>{officer.name}</strong>
              {officer.email && <span className="cell-sub">{officer.email}</span>}
              {officer.appointed_at && <span className="cell-sub">Designado {formatDate(officer.appointed_at)}</span>}
              <Badge variant="success">Vigente</Badge>
            </>
          ) : (
            <>
              <p className="empty-state compact">Sin oficial designado</p>
              {canEdit && (
                <Link to={`/cumplimiento${q}&accion=oficial`}>
                  <Button size="sm"><Plus size={14} /> Designar oficial</Button>
                </Link>
              )}
            </>
          )}
          {pastOfficers.length > 0 && (
            <span className="cell-sub">{pastOfficers.length} registro(s) histórico(s)</span>
          )}
        </div>

        <div className="client-compliance-block">
          <h3>Manual PLD</h3>
          {manual ? (
            <>
              <strong>{manual.title}</strong>
              <span className="cell-sub">v{manual.version} · vigente desde {formatDate(manual.effective_date)}</span>
              {manual.storage_path && (
                <Button size="sm" variant="secondary" onClick={async () => {
                  const url = await getComplianceManualUrl(manual.storage_path!)
                  if (url) window.open(url, '_blank')
                }}>
                  <Download size={14} /> Descargar
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="empty-state compact">Sin manual vigente</p>
              {canEdit && (
                <Link to={`/cumplimiento${q}&accion=manual`}>
                  <Button size="sm"><Upload size={14} /> Subir manual</Button>
                </Link>
              )}
            </>
          )}
        </div>

        <div className="client-compliance-block">
          <h3><GraduationCap size={16} /> Capacitaciones</h3>
          {clientTrainings.length === 0 ? (
            <>
              <p className="empty-state compact">Sin capacitaciones registradas</p>
              {canEdit && (
                <Link to={`/cumplimiento${q}&accion=capacitacion`}>
                  <Button size="sm"><Plus size={14} /> Registrar</Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <div className="mini-list">
                {clientTrainings.slice(0, 3).map((t) => (
                  <Link key={t.id} to={`/cumplimiento?capacitacion=${t.id}`} className="mini-list-item">
                    <strong>{t.title}</strong>
                    <span>{formatDate(t.session_date)}</span>
                    {t.certificate_text ? <Badge variant="success">Diploma</Badge> : <Badge variant="warning">Sin diploma</Badge>}
                  </Link>
                ))}
              </div>
              {canEdit && (
                <Link to={`/cumplimiento${q}&accion=capacitacion`}>
                  <Button size="sm" variant="secondary"><Plus size={14} /> Nueva capacitación</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
