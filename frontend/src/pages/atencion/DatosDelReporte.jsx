import { useId } from 'react'
import { Card } from '../../shared/components'
import { formatDateTime, formatTelefono, getDisplayName } from '../../utils/format.js'

// subcategoría y descripción solo salen si el ticket las tiene
export default function DatosDelReporte({ ticket }) {
  const tituloId = useId()
  const filas = [
    ['Solicitante', getDisplayName(ticket.solicitante)],
    ['Teléfono', formatTelefono(ticket.solicitante.telefono)],
    ticket.subcategoria && ['Subcategoría', ticket.subcategoria.nombre],
    ['Registrado', formatDateTime(ticket.creadoEn)],
  ].filter(Boolean)

  return (
    <Card as="section" className="ticket-dato-card" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="ticket-dato-card__titulo">
        Datos del reporte
      </h2>
      <dl className="ticket-datos">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="ticket-datos__fila">
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {ticket.descripcion && <blockquote className="ticket-dato-card__cita">«{ticket.descripcion}»</blockquote>}
    </Card>
  )
}
