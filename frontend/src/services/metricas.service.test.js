import { describe, expect, it } from 'vitest'
import { writeTable } from '../repositories/db.js'
import { obtenerTablero } from './metricas.service.js'

const SUP = 'usr-003'
const RANGO = { desde: '2026-09-01', hasta: '2026-09-01' }
const base = { categoriaId: 'cat-01', ambienteId: 'amb-01', usuarioId: 'usr-001', asignadoA: 'usr-002', prioridad: 'alta', estado: 'cerrado' }

describe('HU-7.1 · métricas', () => {
  it('solo permite supervisores activos y valida el rango', async () => {
    await expect(obtenerTablero('usr-002', RANGO)).rejects.toMatchObject({ status: 403 })
    await expect(obtenerTablero(SUP, { desde: '2026-02-30', hasta: '2026-03-01' })).rejects.toMatchObject({ status: 400 })
    await expect(obtenerTablero(SUP, { desde: '2026-09-02', hasta: '2026-09-01' })).rejects.toMatchObject({ status: 400 })
  })

  it('incluye el día completo de Lima y descuenta las esperas del promedio', async () => {
    writeTable('tickets', [
      { ...base, id: 'uno', creadoEn: '2026-09-01T05:00:00Z', cerradoEn: '2026-09-01T09:00:00Z' },
      { ...base, id: 'dos', creadoEn: '2026-09-02T04:59:59Z', cerradoEn: '2026-09-02T09:00:00Z' },
      { ...base, id: 'tres', creadoEn: '2026-09-02T05:00:00Z', cerradoEn: '2026-09-02T09:00:00Z' },
    ])
    writeTable('historial', [
      { ticketId: 'uno', tipo: 'estado', estado: 'abierto', creadoEn: '2026-09-01T05:00:00Z' },
      { ticketId: 'uno', tipo: 'estado', estado: 'en_espera', creadoEn: '2026-09-01T06:00:00Z' },
      { ticketId: 'uno', tipo: 'estado', estado: 'en_atencion', creadoEn: '2026-09-01T08:00:00Z' },
      { ticketId: 'uno', tipo: 'estado', estado: 'resuelto', creadoEn: '2026-09-01T09:00:00Z' },
    ])
    const d = await obtenerTablero(SUP, RANGO)
    expect(d.total).toBe(2)
    expect(d.promedioMs).toBe(2 * 3600000)
    expect(d.porEstado.reduce((total, e) => total + e.total, 0)).toBe(2)
    expect(d.porCategoria.reduce((total, e) => total + e.total, 0)).toBe(2)
  })

  it('los periodos sin datos no producen NaN ni porcentajes infinitos', async () => {
    writeTable('tickets', [])
    const d = await obtenerTablero(SUP, RANGO)
    expect(d).toMatchObject({ total: 0, abiertos: 0, porcentajeFuera: 0, variacionTickets: null, promedioMs: null })
    expect(d.ambientes).toEqual([])
  })
})
