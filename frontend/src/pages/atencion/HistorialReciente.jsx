import { useId } from 'react'
import { Card } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDateTime } from '../../utils/format.js'
import { tituloDeEvento } from './eventoDelHistorial.js'

const RECIENTES = 4

// Últimos cambios del ticket; el historial completo se abre desde la cabecera.
export default function HistorialReciente({ eventos, tiempos, cerrado }) {
  const tituloId = useId()
  const recientes = eventos.slice(-RECIENTES)

  return (
    <Card as="section" className="ticket-dato-card" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="ticket-dato-card__titulo">
        Historial reciente
      </h2>
      <ol className="ticket-recientes">
        {recientes.map((evento) => (
          <li key={evento.id} className="ticket-recientes__evento">
            <span>{tituloDeEvento(evento)}</span>{' '}
            <time dateTime={evento.creadoEn} className="ticket-recientes__momento">
              {formatDateTime(evento.creadoEn)}
            </time>
          </li>
        ))}
      </ol>
      <p className="ticket-dato-card__nota">
        {formatDuracion(tiempos.totalMs)} {cerrado ? 'de atención en total' : 'transcurridos'}
      </p>
    </Card>
  )
}
