import { useId } from 'react'
import { Card } from '../../shared/components'
import { formatDateTime, formatTelefono, getDisplayName } from '../../utils/format.js'

/**
 * Datos del reporte (HU-5 · 5.6, p25): quién reportó el ticket y cómo ubicarlo, qué reportó y quién lo atiende. La
 * subcategoría y la descripción se muestran cuando el ticket las tiene.
 */
export default function DatosDelReporte({ ticket, tiempos }) {
  const tituloId = useId()
  const filas = [
    ['Solicitante', getDisplayName(ticket.solicitante)],
    ['Teléfono', formatTelefono(ticket.solicitante.telefono)],
    ['Categoría', ticket.categoria.nombre],
    ticket.subcategoria && ['Subcategoría', ticket.subcategoria.nombre],
    ['Registrado', formatDateTime(ticket.creadoEn)],
    ['Técnico asignado', ticket.tecnico ? getDisplayName(ticket.tecnico) : 'Sin asignar'],
    ['Atención esperada', `${tiempos.esperadoHoras} h`],
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
