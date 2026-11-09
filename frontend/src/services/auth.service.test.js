import { describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, sessionRepository } from '../repositories/session.repository.js'
import { tokenDePrueba } from '../test/apiSimulada/index.js'
import { guardarSesion } from '../test/test-utils.jsx'
import { cambiarPassword, cerrarSesion, iniciarSesion, obtenerSesion } from './auth.service.js'

// las reglas del login (intentos, bloqueos) se prueban en backend/test; aquí, lo que hace el navegador
const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }

const fallo = (promise) => promise.catch((error) => error)
const sesionGuardada = (storage) => JSON.parse(storage.getItem(SESSION_STORAGE_KEY))

describe('auth.service · iniciarSesion', () => {
  it('guarda el token de la API solo en la pestaña', async () => {
    const { usuario } = await iniciarSesion(CAMILA)

    expect(usuario).toMatchObject({ id: 'usr-001', rol: 'usuario' })
    expect(sesionGuardada(sessionStorage)).toMatchObject({ usuarioId: 'usr-001', token: tokenDePrueba('usr-001') })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('con «Recordarme» guarda la sesión en el equipo', async () => {
    await iniciarSesion({ ...CAMILA, recordar: true })

    expect(sesionGuardada(localStorage)).toMatchObject({ usuarioId: 'usr-001' })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('si la API rechaza las credenciales no guarda nada', async () => {
    const error = await fallo(iniciarSesion({ ...CAMILA, password: 'Camila2025' }))

    expect(error).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', details: { intentosRestantes: 4 } })
    expect(sessionRepository.read()).toBeNull()
  })
})

describe('auth.service · obtenerSesion y cerrarSesion', () => {
  it('restaura la sesión con la cuenta que devuelve la API', async () => {
    guardarSesion('usr-002')

    await expect(obtenerSesion()).resolves.toMatchObject({ usuario: { id: 'usr-002', rol: 'tecnico' } })
  })

  it('si la API responde 401 borra la sesión guardada', async () => {
    sessionRepository.save({ usuarioId: 'usr-001', iniciadaEn: '2026-10-01T15:00:00.000Z', token: 'vencido' })

    await expect(obtenerSesion()).resolves.toBeNull()
    expect(sessionRepository.read()).toBeNull()
  })

  it('si el servidor no responde no borra la sesión', async () => {
    guardarSesion('usr-001')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(obtenerSesion()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(sessionRepository.read()).not.toBeNull()
  })

  it('cerrarSesion borra la sesión aunque la API no responda', async () => {
    guardarSesion('usr-001')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await cerrarSesion()

    expect(sessionRepository.read()).toBeNull()
  })
})

describe('auth.service · cambiarPassword', () => {
  it('la contraseña actual incorrecta llega como error del campo', async () => {
    guardarSesion('usr-001')

    const error = await fallo(cambiarPassword({ actual: 'Incorrecta1', nueva: 'Campus2027', confirmacion: 'Campus2027' }))

    expect(error.fieldErrors).toEqual({ actual: 'La contraseña actual no es correcta.' })
  })
})
