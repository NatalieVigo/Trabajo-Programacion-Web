import { ticketsRepository } from '../repositories/tickets.repository.js'

// mismo criterio que los tickets "abiertos" de HU-1
export const ESTADOS_EN_CURSO = Object.freeze(['abierto', 'en_atencion', 'en_espera', 'reabierto'])

export const SIN_TICKETS = Object.freeze({ total: 0, enCurso: 0 })

export function esTicketEnCurso(ticket) {
  return ESTADOS_EN_CURSO.includes(ticket.estado)
}

// arma un Map con { total, enCurso } por valor del campo; si falta el campo no se cuenta
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
