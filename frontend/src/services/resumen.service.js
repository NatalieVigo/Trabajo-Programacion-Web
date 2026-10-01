import { encuestasRepository, ticketsRepository } from '../repositories/tickets.repository.js'
import { simulateRequest } from './request.js'
import { ServiceError } from './ServiceError.js'

const ESTADOS_ABIERTOS = new Set(['abierto', 'en_atencion', 'en_espera', 'reabierto'])
const ESTADOS_EN_COLA = new Set(['abierto', 'reabierto'])
const PLAZO_ENCUESTA_MS = 7 * 24 * 60 * 60 * 1000

/** Tickets cerrados sin encuesta cuyo plazo para responderla (7 días desde el cierre) aún no vence. */
function contarEncuestasPendientes(tickets, encuestas, ahora) {
  const conEncuesta = new Set(encuestas.map((encuesta) => encuesta.ticketId))
  return tickets.filter(
    (ticket) =>
      ticket.estado === 'cerrado' &&
      !conEncuesta.has(ticket.id) &&
      Date.parse(ticket.cerradoEn) + PLAZO_ENCUESTA_MS >= ahora,
  ).length
}

const CONTADORES_POR_ROL = {
  usuario(usuarioId) {
    const tickets = ticketsRepository.findAll({ usuarioId })
    const encuestas = encuestasRepository.findAll({ usuarioId })
    return {
      ticketsAbiertos: tickets.filter((ticket) => ESTADOS_ABIERTOS.has(ticket.estado)).length,
      ticketsReportados: tickets.length,
      encuestasPendientes: contarEncuestasPendientes(tickets, encuestas, Date.now()),
      encuestasRespondidas: encuestas.length,
    }
  },
  tecnico(usuarioId) {
    return { asignados: ticketsRepository.findAll({ asignadoA: usuarioId }).length }
  },
  supervisor() {
    const enCola = ticketsRepository.findAll((ticket) => ticket.asignadoA === null && ESTADOS_EN_COLA.has(ticket.estado))
    return { colaSinAsignar: enCola.length }
  },
}

/**
 * Contadores de la cabecera y del menú lateral (SPEC §9). Solo lee tickets (HU-3) y encuestas (HU-6).
 * usuario: { ticketsAbiertos, ticketsReportados, encuestasPendientes, encuestasRespondidas } ·
 * tecnico: { asignados } · supervisor: { colaSinAsignar }. Falla con 401 si no hay un usuario con rol.
 */
export function obtenerContadores(usuario) {
  return simulateRequest(() => {
    if (!usuario?.id || !Object.hasOwn(CONTADORES_POR_ROL, usuario.rol)) {
      throw new ServiceError(401, 'UNAUTHENTICATED', 'Inicia sesión para ver tu resumen.')
    }
    return CONTADORES_POR_ROL[usuario.rol](usuario.id)
  })
}
