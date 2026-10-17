import { describe, expect, it } from 'vitest'
import { historialRepository } from '../repositories/atencion.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import {
  asignarTickets,
  autoasignarTicket,
  listarBandeja,
  listarCola,
} from './cola.service.js'

const SUPERVISOR = 'usr-003'
const JULIO = 'usr-002'
const TICKET = 'tck-00147'

describe('HU-4: integración de la versión del integrante', () => {
  it('autoasigna un ticket disponible y registra al técnico en el historial', async () => {
    const antes = await listarBandeja(JULIO)
    expect(antes.disponibles.some((ticket) => ticket.id === TICKET)).toBe(true)

    await autoasignarTicket(TICKET, JULIO)

    expect(ticketsRepository.findById(TICKET).asignadoA).toBe(JULIO)
    expect(historialRepository.findAll({ ticketId: TICKET }).at(-1)).toMatchObject({
      autorId: JULIO,
      asignadoA: JULIO,
      motivo: 'Autoasignación del técnico.',
    })
    const despues = await listarBandeja(JULIO)
    expect(despues.disponibles.some((ticket) => ticket.id === TICKET)).toBe(false)
    expect(despues.tickets.some((ticket) => ticket.id === TICKET)).toBe(true)
  })

  it('no permite tomar un ticket ya asignado ni una categoría no habilitada', async () => {
    await autoasignarTicket(TICKET, JULIO)
    await expect(autoasignarTicket(TICKET, JULIO)).rejects.toMatchObject({
      status: 409,
    })
    const cola = await listarCola(SUPERVISOR)
    const tecnico = cola.tecnicos.find((persona) => persona.id === JULIO)
    const ajeno = cola.tickets.find(
      (ticket) =>
        !ticket.tecnicoId && !tecnico.habilitadas.includes(ticket.categoriaId),
    )
    expect(ajeno).toBeDefined()
    await expect(autoasignarTicket(ajeno.id, JULIO)).rejects.toMatchObject({
      status: 403,
    })
    await expect(autoasignarTicket(TICKET, SUPERVISOR)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('exige un motivo de reasignación y lo conserva con el cambio', async () => {
    await asignarTickets([TICKET], JULIO, '', SUPERVISOR)
    const cola = await listarCola(SUPERVISOR)
    const ticket = cola.tickets.find((fila) => fila.id === TICKET)
    const otro = cola.tecnicos.find(
      (persona) =>
        persona.id !== JULIO && persona.habilitadas.includes(ticket.categoriaId),
    )
    expect(otro).toBeDefined()

    await expect(
      asignarTickets([TICKET], otro.id, '', SUPERVISOR),
    ).rejects.toMatchObject({ status: 400 })
    expect(ticketsRepository.findById(TICKET).asignadoA).toBe(JULIO)

    const motivo = 'Repartir la carga durante el turno de la tarde.'
    await asignarTickets([TICKET], otro.id, motivo, SUPERVISOR)
    expect(historialRepository.findAll({ ticketId: TICKET }).at(-1)).toMatchObject({
      asignadoA: otro.id,
      motivo,
    })
  })
})
