import { cx } from '../../utils/classNames.js'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDate, formatDateTime, formatEstado, formatRol, getDisplayName } from '../../utils/format.js'

/** Título del evento: el estado al que pasó el ticket o a quién se asignó. */
function tituloDe(evento) {
  if (evento.tipo === 'asignacion') {
    return evento.asignadoA ? `Asignado a ${getDisplayName(evento.asignadoA)}` : 'Devuelto a la cola'
  }
  return formatEstado(evento.estado)
}

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

/**
 * Historial de un ticket como línea de tiempo (HU-5 · 5.5, p27): cada cambio de estado y cada asignación con su autor
 * y su momento, del más antiguo al más reciente. Las esperas muestran su motivo y su fecha estimada de retorno, y el
 * cierre, la solución aplicada.
 */
export default function LineaDeTiempo({ eventos, ...rest }) {
  return (
    <ol {...rest} className="linea-tiempo">
      {eventos.map((evento) => {
        const permanencia = permanenciaDe(evento)
        return (
          <li
            key={evento.id}
            className={cx('linea-tiempo__evento', `linea-tiempo__evento--${evento.estado ?? 'asignacion'}`)}
          >
            <p className="linea-tiempo__titulo">{tituloDe(evento)}</p>
            <p className="linea-tiempo__detalle">
              <time dateTime={evento.creadoEn}>{formatDateTime(evento.creadoEn)}</time> · {autorDe(evento)}
            </p>
            {evento.motivo && (
              <p className="linea-tiempo__nota">
                Motivo: {evento.motivo} Retorno estimado: {formatDate(evento.retornoEstimado)}.
              </p>
            )}
            {evento.solucion && <p className="linea-tiempo__nota">Solución: {evento.solucion}</p>}
            {permanencia && <p className="linea-tiempo__detalle">{permanencia}</p>}
          </li>
        )
      })}
    </ol>
  )
}
