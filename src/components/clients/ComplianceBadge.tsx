import { Badge } from '../ui/Badge'
import type { ComplianceSummary } from '../../lib/compliance'

interface ComplianceBadgeProps {
  summary: ComplianceSummary
}

export function ComplianceBadge({ summary }: ComplianceBadgeProps) {
  const variant = summary.status === 'verde' ? 'success' : summary.status === 'amarillo' ? 'warning' : 'danger'
  return (
    <div className={`compliance-badge compliance-${summary.status}`}>
      <Badge variant={variant}>{summary.label}</Badge>
      {summary.issues.length > 0 && (
        <ul className="compliance-issues">
          {summary.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
