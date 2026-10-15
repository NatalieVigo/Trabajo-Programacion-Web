import { cx } from '../../utils/classNames.js'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDate, formatDateTime, formatPrioridad, formatRol, getDisplayName } from '../../utils/format.js'
import { tituloDeEvento } from './eventoDelHistorial.js'

/** Quién lo hizo, con su rol: «Lucía Mendoza Ríos (supervisor)». */
function autorDe({ autor }) {
  return `${getDisplayName(autor)} (${formatRol(autor.rol).toLowerCase()})`
}

/** Cuánto estuvo el ticket en ese estado; el actual sigue contando y el cierre ya no acumula tiempo. */
function permanenciaDe(evento) {
  if (evento.tipo !== 'estado' || evento.estado === 'cerrado') return null
  const duracion = formatDuracion(evento.duracionMs)
  return evento.enCurso ? `Lleva ${duracion} en este estado` : `Permaneció ${duracion} en este estado`
}

/** Título del evento; una espera lleva su motivo: «En espera · repuesto de canaleta» (p27). */
function tituloDe(evento) {
  const titulo = tituloDeEvento(evento)
  return evento.tipo === 'estado' && evento.estado === 'en_espera' && evento.motivo
    ? `${titulo} · ${evento.motivo}`
    : titulo
}

/**
 * Lo que sigue al autor en la línea de detalle (p27): la prioridad inicial en el registro, el retorno estimado de una
 * espera y la encuesta que se envía al cerrar.
 */
function complementosDe(evento, indice, prioridadInicial) {
  if (evento.tipo !== 'estado') return []
  if (indice === 0 && evento.estado === 'abierto' && prioridadInicial) {
    return [`prioridad inicial ${formatPrioridad(prioridadInicial).toLowerCase()}`]
  }
  if (evento.estado === 'en_espera' && evento.retornoEstimado) {
    return [`retorno estimado ${formatDate(evento.retornoEstimado)}`]
  }
  if (evento.estado === 'cerrado') return ['encuesta enviada al usuario']
  return []
}

/**
 * Historial de un ticket como línea de tiempo (HU-5 · 5.5, p27): cada cambio de estado y cada asignación con su autor
 * y su momento, del más antiguo al más reciente. El registro indica la prioridad inicial (`prioridadInicial`), las
 * esperas su motivo y su fecha estimada de retorno, y el cierre, que se envió la encuesta.
 */
export default function LineaDeTiempo({ eventos, prioridadInicial, ...rest }) {
  return (
    <ol {...rest} className="linea-tiempo">
      {eventos.map((evento, indice) => {
        const permanencia = permanenciaDe(evento)
        const detalle = [autorDe(evento), ...complementosDe(evento, indice, prioridadInicial)].join(' · ')
        return (
          <li
            key={evento.id}
            className={cx('linea-tiempo__evento', `linea-tiempo__evento--${evento.estado ?? evento.tipo}`)}
          >
            <p className="linea-tiempo__titulo">{tituloDe(evento)}</p>
            <p className="linea-tiempo__detalle">
              <time dateTime={evento.creadoEn}>{formatDateTime(evento.creadoEn)}</time> · {detalle}
            </p>
            {evento.motivo && evento.tipo === 'prioridad' && (
              <p className="linea-tiempo__nota">Motivo: {evento.motivo}</p>
            )}
            {permanencia && <p className="linea-tiempo__detalle">{permanencia}</p>}
          </li>
        )
      })}
    </ol>
  )
}
