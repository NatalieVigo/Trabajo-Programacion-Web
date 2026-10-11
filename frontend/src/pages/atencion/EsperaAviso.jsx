import { Alert } from '../../shared/components'
import { formatDate, formatDateTime } from '../../utils/format.js'

/**
 * Aviso de un ticket en espera (HU-5 · 5.3): el motivo, desde cuándo espera y la fecha estimada de retorno. Si esa
 * fecha ya pasó, lo señala para que se retome la atención.
 */
export default function EsperaAviso({ espera }) {
  return (
    <Alert variant={espera.retornoVencido ? 'warning' : 'info'} title="Ticket en espera">
      <p>{espera.motivo}</p>
      <p className="text-aux">
        En espera desde el {formatDateTime(espera.desde)} · retorno estimado: {formatDate(espera.retornoEstimado)}
        {espera.retornoVencido && ' · la fecha estimada ya pasó'}
      </p>
    </Alert>
  )
}
