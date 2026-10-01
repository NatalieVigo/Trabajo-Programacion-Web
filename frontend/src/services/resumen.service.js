import { invitacionesRepository } from '../repositories/invitaciones.repository.js'
import { encuestasRepository, ticketsRepository } from '../repositories/tickets.repository.js'
import { estadoEfectivo } from './estadoInvitacion.js'
import { simulateRequest } from './request.js'
import { ServiceError } from './ServiceError.js'

const ESTADOS_ABIERTOS = new Set(['abierto', 'en_atencion', 'en_espera', 'reabierto'])
const ESTADOS_EN_COLA = new Set(['abierto', 'reabierto'])
const PLAZO_ENCUESTA_MS = 7 * 24 * 60 * 60 * 1000

const esAbierto = (ticket) => ESTADOS_ABIERTOS.has(ticket.estado)

/**
 * Tickets cerrados sin encuesta cuyo plazo para responderla (7 días desde el cierre) aún no vence, de la que vence
 * antes a la que vence después: { ticketCodigo, cerradoEn, fechaLimite }.
 */
function encuestasPendientes(tickets, encuestas, ahora) {
  const conEncuesta = new Set(encuestas.map((encuesta) => encuesta.ticketId))
  return tickets
    .filter((ticket) => ticket.estado === 'cerrado' && !conEncuesta.has(ticket.id))
    .map((ticket) => ({ ticket, limite: Date.parse(ticket.cerradoEn) + PLAZO_ENCUESTA_MS }))
    .filter(({ limite }) => limite >= ahora)
    .sort((a, b) => a.limite - b.limite)
    .map(({ ticket, limite }) => ({
      ticketCodigo: ticket.codigo,
      cerradoEn: ticket.cerradoEn,
      fechaLimite: new Date(limite).toISOString(),
    }))
}

/** Tickets que reportó el usuario, sus encuestas respondidas y las que aún puede responder. */
function actividadDelUsuario(usuarioId) {
  const tickets = ticketsRepository.findAll({ usuarioId })
  const encuestas = encuestasRepository.findAll({ usuarioId })
  return { tickets, encuestas, pendientes: encuestasPendientes(tickets, encuestas, Date.now()) }
}

const CONTADORES_POR_ROL = {
  usuario(usuarioId) {
    const { tickets, encuestas, pendientes } = actividadDelUsuario(usuarioId)
    return {
      ticketsAbiertos: tickets.filter(esAbierto).length,
      ticketsReportados: tickets.length,
      encuestasPendientes: pendientes.length,
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

const RESUMEN_DE_CUENTA_POR_ROL = {
  usuario(usuarioId) {
    const { tickets, pendientes } = actividadDelUsuario(usuarioId)
    return {
      ticketsReportados: tickets.length,
      abiertosAhora: tickets.filter(esAbierto).length,
      encuestaPendiente: pendientes[0] ?? null,
    }
  },
  tecnico(usuarioId) {
    const asignados = ticketsRepository.findAll({ asignadoA: usuarioId })
    return {
      ticketsAsignados: asignados.length,
      enAtencion: asignados.filter((ticket) => ticket.estado === 'en_atencion').length,
    }
  },
  supervisor(usuarioId) {
    const ahora = Date.now()
    const enviadas = invitacionesRepository.findAll({ invitadoPor: usuarioId })
    return {
      invitacionesPendientes: enviadas.filter((invitacion) => estadoEfectivo(invitacion, ahora) === 'pendiente').length,
    }
  },
}

/**
 * Resumen de la cuenta para «Mi cuenta» (p10), según el rol. Paso interno de usuarios.service#obtenerResumenCuenta:
 * solo lee tickets, encuestas e invitaciones. La encuesta pendiente es la que vence primero.
 */
export function resumenDeCuenta(usuario) {
  return { ...RESUMEN_DE_CUENTA_POR_ROL[usuario.rol](usuario.id), cuentaCreada: usuario.creadoEn }
}
