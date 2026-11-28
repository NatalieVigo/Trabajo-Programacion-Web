import { describe, expect, it } from 'vitest'
import { readTable } from '../repositories/db.js'
import { espiarApi, ultimaPeticion } from '../test/espiarApi.js'
import { DEMO, guardarSesion } from '../test/test-utils.jsx'
import { bloquearCuenta, desbloquearCuenta, listarCuentas, obtenerFichaCuenta } from './administracionUsuarios.service.js'
import { iniciarSesion } from './auth.service.js'

// las reglas se prueban en test/usuarios.test.js del backend; aquí, con el simulador de la API
const SUPERVISORA = 'Bearer prueba.usr-003'
const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }

describe('HU-7.3 · administración de cuentas', () => {
  it('la ficha agrega reportes y encuestas de esa persona y permite recuperar su cuenta', async () => {
    guardarSesion(DEMO.supervisor)
    const ficha = await obtenerFichaCuenta('usr-001')
    expect(ficha.resumen).toMatchObject({ reportados: 12, abiertos: 3, cerrados: 8 })
    expect(ficha.reportes.filter((r) => r.encuesta !== null)).toHaveLength(7)
    expect(ficha.cuenta.ultimoAccesoEn).toBeNull()
    await expect(obtenerFichaCuenta('no-existe')).rejects.toMatchObject({ status: 404 })
    await bloquearCuenta('usr-001', { motivo: 'Reportes duplicados.' })
    await desbloquearCuenta('usr-001')
    await expect(iniciarSesion(CAMILA)).resolves.toMatchObject({ usuario: { estado: 'activo' } })
    guardarSesion(DEMO.supervisor)
    expect((await obtenerFichaCuenta('usr-001')).cuenta.ultimoAccesoEn).toBeTruthy()
  })

  it('solo lista para supervisor y no devuelve credenciales', async () => {
    guardarSesion(DEMO.usuario)
    await expect(listarCuentas()).rejects.toMatchObject({ status: 403 })
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()
    const cuentas = await listarCuentas()
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/usuarios', method: 'GET', token: SUPERVISORA })
    expect(cuentas).toHaveLength(10)
    expect(cuentas.find((u) => u.id === 'usr-001').ticketsReportados).toBe(12)
    expect(cuentas.some((u) => 'passwordHash' in u || 'passwordSalt' in u)).toBe(false)
  })

  it('bloquea sin perder tickets, guarda motivo/notificación e impide entrar', async () => {
    guardarSesion(DEMO.supervisor)
    const tickets = readTable('tickets')
    const fetch = espiarApi()
    await bloquearCuenta('usr-001', { motivo: 'Reportes duplicados.', notificar: true })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/usuarios/usr-001/bloqueo', method: 'PATCH', token: SUPERVISORA })
    expect(readTable('usuarios').find((u) => u.id === 'usr-001')).toMatchObject({ estado: 'bloqueado', motivoBloqueo: 'Reportes duplicados.', notificacionBloqueoSolicitada: true })
    expect(readTable('tickets')).toEqual(tickets)
    await expect(iniciarSesion(CAMILA)).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' })
  })

  it('valida motivo, rol, cuenta actual y tickets críticos sin escribir parcialmente', async () => {
    const antes = readTable('usuarios')
    guardarSesion(DEMO.supervisor)
    await expect(bloquearCuenta('usr-001', { motivo: ' ' })).rejects.toMatchObject({ status: 400 })
    await expect(bloquearCuenta('usr-003', { motivo: 'Prueba' })).rejects.toMatchObject({ code: 'SELF_BLOCK' })
    await expect(bloquearCuenta('usr-002', { motivo: 'Prueba' })).rejects.toMatchObject({ code: 'CRITICAL_TICKETS' })
    guardarSesion(DEMO.tecnico)
    await expect(bloquearCuenta('usr-001', { motivo: 'Prueba' })).rejects.toMatchObject({ status: 403 })
    expect(readTable('usuarios')).toEqual(antes)
  })
})

describe('administracionUsuarios.service · orden de las validaciones', () => {
  it('sin permiso responde 403 aunque el motivo también sea inválido', async () => {
    guardarSesion(DEMO.tecnico)
    await expect(bloquearCuenta('usr-001', { motivo: ' ' })).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })
})
