import { cx } from '../../utils/classNames.js'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDate, formatDateTime, formatPrioridad, formatRol, getDisplayName } from '../../utils/format.js'
import { tituloDeEvento } from './eventoDelHistorial.js'

function autorDe({ autor }) {
  return `${getDisplayName(autor)} (${formatRol(autor.rol).toLowerCase()})`
}

// el estado actual sigue sumando; el cierre ya no cuenta tiempo
function permanenciaDe(evento) {
  if (evento.tipo !== 'estado' || evento.estado === 'cerrado') return null
  const duracion = formatDuracion(evento.duracionMs)
  return evento.enCurso ? `Lleva ${duracion} en este estado` : `Permaneció ${duracion} en este estado`
}

function tituloDe(evento) {
  const titulo = tituloDeEvento(evento)
  return evento.tipo === 'estado' && evento.estado === 'en_espera' && evento.motivo
    ? `${titulo} · ${evento.motivo}`
    : titulo
}

// datos extra que van después del autor, según el tipo de evento
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

// Cambios de estado y asignaciones del ticket, del más antiguo al más reciente.
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
