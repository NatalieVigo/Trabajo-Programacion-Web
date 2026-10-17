import { PriorityBadge, StatusBadge } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import { HORA_MS, formatDuracion } from '../../utils/duracion.js'

// en espera el plazo se pausa, y resuelto o cerrado ya no cuentan
const ESTADOS_CON_PLAZO = new Set(['abierto', 'reabierto', 'en_atencion'])

function plazoDe(ticket, tiempos) {
  if (!ESTADOS_CON_PLAZO.has(ticket.estado)) return null
  const restanteMs = tiempos.esperadoHoras * HORA_MS - tiempos.atencionMs
  return restanteMs >= 0
    ? { texto: `Vence en ${formatDuracion(restanteMs)}`, vencido: false }
    : { texto: `Vencido hace ${formatDuracion(-restanteMs)}`, vencido: true }
}

export default function TicketCabecera({ ticket, tiempos, acciones }) {
  const plazo = plazoDe(ticket, tiempos)

  return (
    <div className="ticket-cabecera">
      <div className="ticket-cabecera__texto">
        <div className="ticket-cabecera__linea">
          <h1 className="ticket-cabecera__codigo">{ticket.codigo}</h1>
          <p className="ticket-cabecera__etiquetas">
            <span className="visually-hidden">Prioridad: </span>
            <PriorityBadge prioridad={ticket.prioridad} />
            <span className="visually-hidden">. Estado: </span>
            <StatusBadge estado={ticket.estado} />
            {plazo && (
              <span className={cx('ticket-cabecera__plazo', plazo.vencido && 'ticket-cabecera__plazo--vencido')}>
                <span className="visually-hidden">. </span>
                {plazo.texto}
              </span>
            )}
          </p>
        </div>
        <p className="ticket-cabecera__asunto">
          {ticket.asunto} · {ticket.categoria.nombre}
        </p>
      </div>
      {acciones && <div className="ticket-cabecera__acciones">{acciones}</div>}
    </div>
  )
}
