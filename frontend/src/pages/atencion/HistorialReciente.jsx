import { useId } from 'react'
import { Card, TextLink } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDateTime } from '../../utils/format.js'
import { tituloDeEvento } from './eventoDelHistorial.js'

/** Cuántos eventos se muestran: los últimos del historial. */
const RECIENTES = 4

/**
 * Historial reciente (HU-5 · 5.6, p25): los últimos cambios del ticket y el tiempo que lleva, con el enlace a su
 * historial completo (`rutaDelHistorial`).
 */
export default function HistorialReciente({ eventos, tiempos, cerrado, rutaDelHistorial }) {
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
      <TextLink to={rutaDelHistorial}>Ver el historial completo</TextLink>
    </Card>
  )
}
