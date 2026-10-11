import { PriorityBadge, StatusBadge } from '../../shared/components'

/** Cabecera de un ticket (p25): código, prioridad, estado, asunto y categoría, con las `acciones` a la derecha. */
export default function TicketCabecera({ ticket, acciones }) {
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
