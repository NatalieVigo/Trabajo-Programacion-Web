import { formatPrioridad } from '../../../utils/format.js'
import Badge from './Badge.jsx'

const TONES = {
  critica: 'danger',
  alta: 'accent',
  media: 'warning',
  baja: 'info',
}

export default function PriorityBadge({ prioridad, className }) {
  return (
    <Badge tone={TONES[prioridad] ?? 'neutral'} className={className}>
      {formatPrioridad(prioridad)}
    </Badge>
  )
}
