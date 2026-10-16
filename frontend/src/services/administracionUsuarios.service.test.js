import { describe, expect, it } from 'vitest'
import { readTable } from '../repositories/db.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { bloquearCuenta, listarCuentas } from './administracionUsuarios.service.js'
import { iniciarSesion, obtenerSesion } from './auth.service.js'

describe('HU-7.3 · administración de cuentas', () => {
  it('solo lista para supervisor y no devuelve credenciales', async () => {
    await expect(listarCuentas('usr-001')).rejects.toMatchObject({ status: 403 })
    const cuentas = await listarCuentas('usr-003')
    expect(cuentas).toHaveLength(10)
    expect(cuentas.find((u) => u.id === 'usr-001').ticketsReportados).toBe(12)
    expect(cuentas.some((u) => 'passwordHash' in u || 'passwordSalt' in u)).toBe(false)
  })

  it('bloquea sin perder tickets, guarda motivo/notificación e impide entrar', async () => {
    const tickets = readTable('tickets')
    sessionRepository.save({ usuarioId: 'usr-001', iniciadaEn: new Date().toISOString() })
    await bloquearCuenta('usr-001', { motivo: 'Reportes duplicados.', notificar: true }, 'usr-003')
    expect(readTable('usuarios').find((u) => u.id === 'usr-001')).toMatchObject({ estado: 'bloqueado', motivoBloqueo: 'Reportes duplicados.', notificacionBloqueoSolicitada: true })
    expect(readTable('tickets')).toEqual(tickets)
    await expect(obtenerSesion()).resolves.toBeNull()
    await expect(iniciarSesion({ correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' })).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' })
  })

  it('valida motivo, rol, cuenta actual y tickets críticos sin escribir parcialmente', async () => {
    const antes = readTable('usuarios')
    await expect(bloquearCuenta('usr-001', { motivo: ' ' }, 'usr-003')).rejects.toMatchObject({ status: 400 })
    await expect(bloquearCuenta('usr-001', { motivo: 'Prueba' }, 'usr-002')).rejects.toMatchObject({ status: 403 })
    await expect(bloquearCuenta('usr-003', { motivo: 'Prueba' }, 'usr-003')).rejects.toMatchObject({ code: 'SELF_BLOCK' })
    await expect(bloquearCuenta('usr-002', { motivo: 'Prueba' }, 'usr-003')).rejects.toMatchObject({ code: 'CRITICAL_TICKETS' })
    expect(readTable('usuarios')).toEqual(antes)
  })
})
