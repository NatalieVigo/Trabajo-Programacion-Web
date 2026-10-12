import { describe, expect, it } from 'vitest'
import { historialRepository, bitacoraRepository } from '../repositories/atencion.repository.js'
import { DB_STORAGE_KEY } from '../repositories/db.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { obtenerAtencion } from './atencion.service.js'
import { asignarTickets, cambiarPrioridadTickets, devolverTickets } from './cola.service.js'

const SUPERVISOR = 'usr-003'
const JULIO = 'usr-002'
const TICKET = 'tck-00147'

describe('cola.service · HU-4', () => {
  it('asigna un ticket habilitado, persiste en localStorage y deja historial y nota interna', async () => {
    await asignarTickets([TICKET], JULIO, 'Hay clase de 10:00 a 13:00.', SUPERVISOR)
    expect(ticketsRepository.findById(TICKET).asignadoA).toBe(JULIO)
    expect(JSON.parse(localStorage.getItem(DB_STORAGE_KEY)).tickets.find(({ id }) => id === TICKET).asignadoA).toBe(JULIO)
    expect(historialRepository.findAll({ ticketId: TICKET }).at(-1)).toMatchObject({ tipo: 'asignacion', asignadoA: JULIO, autorId: SUPERVISOR })
    expect(bitacoraRepository.findAll({ ticketId: TICKET }).at(-1)).toMatchObject({ tipo: 'interno', mensaje: 'Hay clase de 10:00 a 13:00.' })
  })

  it('rechaza un lote sin técnico habilitado para todas las categorías sin guardar cambios parciales', async () => {
    const antes = localStorage.getItem(DB_STORAGE_KEY)
    await expect(asignarTickets(['tck-00146', TICKET], JULIO, '', SUPERVISOR)).rejects.toMatchObject({ status: 400 })
    expect(localStorage.getItem(DB_STORAGE_KEY)).toBe(antes)
    await expect(asignarTickets([TICKET], JULIO, '', 'usr-001')).rejects.toMatchObject({ status: 403 })
  })

  it('cambia prioridad y plazo del ticket sin alterar el catálogo; el historial explica el cambio', async () => {
    await cambiarPrioridadTickets(['tck-00141'], 'critica', 'Afecta a un evento institucional.', SUPERVISOR)
    expect(ticketsRepository.findById('tck-00141')).toMatchObject({ prioridad: 'critica', tiempoEsperadoHoras: 2 })
    expect(historialRepository.findAll({ ticketId: 'tck-00141' }).at(-1)).toMatchObject({ tipo: 'prioridad', prioridadNueva: 'critica', motivo: 'Afecta a un evento institucional.' })
    expect((await obtenerAtencion('TCK-2026-00141', SUPERVISOR)).tiempos.esperadoHoras).toBe(2)
    await expect(cambiarPrioridadTickets([TICKET], 'baja', '', SUPERVISOR)).rejects.toMatchObject({ status: 400 })
  })

  it('devuelve un ticket a Abierto y conserva la bitácora y el historial anterior', async () => {
    const antes = historialRepository.findAll({ ticketId: 'tck-00144' }).length
    const entradas = bitacoraRepository.findAll({ ticketId: 'tck-00144' }).length
    await devolverTickets(['tck-00144'], SUPERVISOR)
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'abierto', asignadoA: null })
    expect(historialRepository.findAll({ ticketId: 'tck-00144' })).toHaveLength(antes + 2)
    expect(bitacoraRepository.findAll({ ticketId: 'tck-00144' })).toHaveLength(entradas)
    await expect(devolverTickets([TICKET], SUPERVISOR)).rejects.toMatchObject({ status: 409 })
  })
})
