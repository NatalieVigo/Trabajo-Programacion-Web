import { Alert } from '../../shared/components'
import { formatDate, formatDateTime } from '../../utils/format.js'

// si la fecha de retorno ya pasó, el aviso pasa a advertencia
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
