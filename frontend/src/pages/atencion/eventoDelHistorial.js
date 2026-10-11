import { formatEstado, getDisplayName } from '../../utils/format.js'

/** Nombre de un evento del historial: el estado al que pasó el ticket o a quién se asignó. */
export function tituloDeEvento(evento) {
  if (evento.tipo === 'asignacion') {
    return evento.asignadoA ? `Asignado a ${getDisplayName(evento.asignadoA)}` : 'Devuelto a la cola'
  }
  return formatEstado(evento.estado)
}
