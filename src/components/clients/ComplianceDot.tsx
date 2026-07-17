import type { ComplianceSummary } from '../../lib/compliance'
import { Badge } from '../ui/Badge'

export function ComplianceDot({ summary }: { summary: ComplianceSummary }) {
  const variant = summary.status === 'verde' ? 'success' : summary.status === 'amarillo' ? 'warning' : 'danger'
  return (
    <span className="compliance-dot-wrap" title={summary.issues.join(' · ') || summary.label}>
      <Badge variant={variant}>{summary.label}</Badge>
    </span>
  )
}
