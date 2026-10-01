import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../repositories/db.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { obtenerContadores } from './resumen.service.js'

// TCK-2026-00131 se cerró el 28/09/2026 a las 22:20 UTC sin encuesta: queda pendiente 7 días.
const FIN_PLAZO_ENCUESTA = '2026-10-05T22:20:00.000Z'

const usuario = (id) => usuariosRepository.findById(id)

function cambiarTicket(id, cambios) {
  writeTable(
    'tickets',
    readTable('tickets').map((ticket) => (ticket.id === id ? { ...ticket, ...cambios } : ticket)),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime('2026-10-01T15:00:00.000Z')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('resumen.service · obtenerContadores', () => {
  it('usuario: tickets abiertos y reportados, encuestas pendientes y respondidas (Camila en el seed)', async () => {
    await expect(obtenerContadores(usuario('usr-001'))).resolves.toEqual({
      ticketsAbiertos: 3,
      ticketsReportados: 12,
      encuestasPendientes: 1,
      encuestasRespondidas: 7,
    })
  })

  it('usuario: un ticket reabierto cuenta como abierto; uno resuelto, no', async () => {
    cambiarTicket('tck-00141', { estado: 'reabierto' })
    await expect(obtenerContadores(usuario('usr-001'))).resolves.toMatchObject({ ticketsAbiertos: 4 })

    cambiarTicket('tck-00141', { estado: 'resuelto' })
    cambiarTicket('tck-00147', { estado: 'resuelto' })
    await expect(obtenerContadores(usuario('usr-001'))).resolves.toMatchObject({ ticketsAbiertos: 2 })
  })

  it('usuario: la encuesta deja de estar pendiente al vencer su plazo de 7 días', async () => {
    vi.setSystemTime(FIN_PLAZO_ENCUESTA)
    await expect(obtenerContadores(usuario('usr-001'))).resolves.toMatchObject({ encuestasPendientes: 1 })

    vi.setSystemTime(Date.parse(FIN_PLAZO_ENCUESTA) + 1)
    await expect(obtenerContadores(usuario('usr-001'))).resolves.toMatchObject({ encuestasPendientes: 0 })
  })

  it('usuario: una encuesta respondida ya no está pendiente', async () => {
    writeTable('encuestas', [
      ...readTable('encuestas'),
      { id: 'enc-008', ticketId: 'tck-00131', usuarioId: 'usr-001', puntaje: 4, respondidaEn: '2026-09-30T15:00:00.000Z' },
    ])

    await expect(obtenerContadores(usuario('usr-001'))).resolves.toMatchObject({
      encuestasPendientes: 0,
      encuestasRespondidas: 8,
    })
  })

  it('usuario sin tickets: todos los contadores en cero', async () => {
    await expect(obtenerContadores(usuario('usr-007'))).resolves.toEqual({
      ticketsAbiertos: 0,
      ticketsReportados: 0,
      encuestasPendientes: 0,
      encuestasRespondidas: 0,
    })
  })

  it('técnico: tickets asignados a él (Julio tiene 8)', async () => {
    await expect(obtenerContadores(usuario('usr-002'))).resolves.toEqual({ asignados: 8 })
    await expect(obtenerContadores(usuario('usr-009'))).resolves.toEqual({ asignados: 1 })
  })

  it('supervisor: tickets de la cola sin asignar', async () => {
    await expect(obtenerContadores(usuario('usr-003'))).resolves.toEqual({ colaSinAsignar: 2 })

    cambiarTicket('tck-00146', { asignadoA: 'usr-009', estado: 'en_atencion' })
    await expect(obtenerContadores(usuario('usr-003'))).resolves.toEqual({ colaSinAsignar: 1 })
  })

  it('responde 401 sin un usuario con rol', async () => {
    await expect(obtenerContadores(null)).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    await expect(obtenerContadores({ id: 'usr-001', rol: 'visitante' })).rejects.toMatchObject({ status: 401 })
    await expect(obtenerContadores({ id: 'usr-001', rol: 'constructor' })).rejects.toMatchObject({ status: 401 })
  })
})
