import { formatEstado, formatPrioridad, getDisplayName } from '../../utils/format.js'

export function tituloDeEvento(evento) {
  if (evento.tipo === 'prioridad') {
    return `Prioridad cambiada de ${formatPrioridad(evento.prioridadAnterior)} a ${formatPrioridad(evento.prioridadNueva)}`
  }
  if (evento.tipo === 'asignacion') {
    return evento.asignadoA ? `Asignado a ${getDisplayName(evento.asignadoA)}` : 'Devuelto a la cola'
  }
  return formatEstado(evento.estado)
}
