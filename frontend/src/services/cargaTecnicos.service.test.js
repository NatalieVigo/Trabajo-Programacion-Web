import { describe, expect, it } from 'vitest'
import { writeTable } from '../repositories/db.js'
import { obtenerCargaTecnicos } from './metricas.service.js'

describe('HU-7.2 · carga de técnicos', () => {
  it('conserva resoluciones de periodos previos aunque el ticket se reabra después', async () => {
    writeTable('tickets', [{ id: 'r', codigo: 'TCK-R', categoriaId: 'cat-01', prioridad: 'alta', usuarioId: 'usr-001', asignadoA: 'usr-002', estado: 'en_atencion', creadoEn: '2026-09-01T12:00:00Z', cerradoEn: null }])
    writeTable('historial', [
      { ticketId: 'r', tipo: 'estado', estado: 'abierto', creadoEn: '2026-09-01T12:00:00Z' },
      { ticketId: 'r', tipo: 'estado', estado: 'resuelto', creadoEn: '2026-09-01T14:00:00Z' },
      { ticketId: 'r', tipo: 'estado', estado: 'reabierto', creadoEn: '2026-09-02T12:00:00Z' },
      { ticketId: 'r', tipo: 'estado', estado: 'resuelto', creadoEn: '2026-09-02T14:00:00Z' },
      { ticketId: 'r', tipo: 'estado', estado: 'reabierto', creadoEn: '2026-10-01T12:00:00Z' },
    ])
    const d = await obtenerCargaTecnicos('usr-003', { desde: '2026-09-01', hasta: '2026-09-30' })
    expect(d.filas.find((t) => t.id === 'usr-002')).toMatchObject({ resueltos: 1, asignados: 1 })
  })
  it('atribuye el resuelto al técnico de esa fecha y descuenta la espera', async () => {
    writeTable('tickets', [{ id: 't', codigo: 'TCK-T', categoriaId: 'cat-01', prioridad: 'alta', usuarioId: 'usr-001', asignadoA: 'usr-009', estado: 'cerrado', creadoEn: '2026-09-01T12:00:00Z', cerradoEn: '2026-09-01T16:00:00Z' }])
    writeTable('historial', [
      { ticketId: 't', tipo: 'estado', estado: 'abierto', creadoEn: '2026-09-01T12:00:00Z' },
      { ticketId: 't', tipo: 'asignacion', asignadoA: 'usr-002', creadoEn: '2026-09-01T12:00:00Z' },
      { ticketId: 't', tipo: 'estado', estado: 'en_espera', creadoEn: '2026-09-01T13:00:00Z' },
      { ticketId: 't', tipo: 'estado', estado: 'en_atencion', creadoEn: '2026-09-01T15:00:00Z' },
      { ticketId: 't', tipo: 'estado', estado: 'resuelto', creadoEn: '2026-09-01T16:00:00Z' },
      { ticketId: 't', tipo: 'asignacion', asignadoA: 'usr-009', creadoEn: '2026-09-02T12:00:00Z' },
    ])
    writeTable('encuestas', [{ ticketId: 't', puntajeGeneral: 4, fechaRespuesta: '2026-09-02T12:00:00Z' }])
    const d = await obtenerCargaTecnicos('usr-003', { desde: '2026-09-01', hasta: '2026-09-30' })
    expect(d.filas.find((t) => t.id === 'usr-002')).toMatchObject({ resueltos: 1, asignados: 0, promedioMs: 7200000, satisfaccion: 4 })
    expect(d.filas.find((t) => t.id === 'usr-009')).toMatchObject({ resueltos: 0, asignados: 0 })
    const vacio = await obtenerCargaTecnicos('usr-003', { desde: '2030-01-01', hasta: '2030-01-02' })
    expect(vacio.filas.every((t) => t.resueltos === 0 && t.satisfaccion === null)).toBe(true)
  })

  it('rechaza otros roles', async () => {
    await expect(obtenerCargaTecnicos('usr-001', { desde: '2026-09-01', hasta: '2026-09-30' })).rejects.toMatchObject({ status: 403 })
  })
})
