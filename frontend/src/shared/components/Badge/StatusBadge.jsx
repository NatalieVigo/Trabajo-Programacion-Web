import { formatEstado } from '../../../utils/format.js'
import Badge from './Badge.jsx'

const TONES = {
  abierto: 'info',
  en_atencion: 'warning',
  en_espera: 'neutral',
  resuelto: 'success',
  cerrado: 'success',
  reabierto: 'danger',
}

export default function StatusBadge({ estado, className }) {
  return (
    <Badge tone={TONES[estado] ?? 'neutral'} className={className}>
      {formatEstado(estado)}
    </Badge>
  )
}
