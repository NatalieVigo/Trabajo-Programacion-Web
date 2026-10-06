import { ticketsRepository } from '../repositories/tickets.repository.js'

/** Estados de un ticket que todavía se atiende. Es el mismo criterio que los tickets «abiertos» de HU-1. */
export const ESTADOS_EN_CURSO = Object.freeze(['abierto', 'en_atencion', 'en_espera', 'reabierto'])

export const SIN_TICKETS = Object.freeze({ total: 0, enCurso: 0 })

export function esTicketEnCurso(ticket) {
  return ESTADOS_EN_CURSO.includes(ticket.estado)
}

/**
 * Tickets agrupados por el valor de `campo` (categoriaId, ambienteId, asignadoA…): Map valor → { total, enCurso }.
 * Los tickets sin ese campo no se cuentan. Solo lee los tickets (HU-3); no los modifica.
 */
export function contarTicketsPor(campo, tickets = ticketsRepository.findAll()) {
  const conteo = new Map()
  for (const ticket of tickets) {
    const clave = ticket[campo]
    if (clave === undefined || clave === null) continue
    const actual = conteo.get(clave) ?? { total: 0, enCurso: 0 }
    conteo.set(clave, {
      total: actual.total + 1,
      enCurso: actual.enCurso + (esTicketEnCurso(ticket) ? 1 : 0),
    })
  }
  return conteo
}
