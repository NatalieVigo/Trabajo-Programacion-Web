import { ESTADOS } from '../../utils/estadosTicket.js'

/** Lógica de la lista «Historial» del técnico (HU-5 · 5.6): búsqueda y filtro por estado. No lee ni escribe datos. */

export const HISTORIAL_SIN_FILTROS = Object.freeze({ busqueda: '', estado: '' })

/** Texto para comparar sin importar mayúsculas ni tildes: «Micrófono» = «microfono». */
function clave(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/** Los tickets cuyo código o asunto contiene la búsqueda y que están en el estado elegido ('' = cualquiera). */
export function filtrarAtendidos(tickets, { busqueda, estado }) {
  const buscado = clave(busqueda)
  return tickets.filter(
    (ticket) =>
      (!estado || ticket.estado === estado) &&
      (!buscado || clave(ticket.codigo).includes(buscado) || clave(ticket.asunto).includes(buscado)),
  )
}

/** Estados en los que hay algún ticket, en el orden del ciclo de atención, con su cantidad: [{ estado, total }]. */
export function contarPorEstado(tickets) {
  return ESTADOS.map((estado) => ({ estado, total: tickets.filter((ticket) => ticket.estado === estado).length })).filter(
    ({ total }) => total > 0,
  )
}
