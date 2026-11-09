import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { reiniciarBase } from '../database/reiniciarBase.js'
import { app } from '../src/app.js'
import { config } from '../src/config.js'
import { pool } from '../src/db/pool.js'

// mismo reloj que las pruebas del frontend
export const AHORA = '2026-10-01T15:27:00.000Z' // 10:27 en Lima

export const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }
export const JULIO = { correo: 'jparedes@ulima.edu.pe', password: 'Tecnico2026' }
export const LUCIA = { correo: 'lmendoza@ulima.edu.pe', password: 'Supervisor2026' }
export const DIEGO = { correo: 'diego.salas@aloe.ulima.edu.pe', password: 'Usuario2026' }

export const api = () => request(app)

export const conToken = (token) => ({ Authorization: `Bearer ${token}` })

export async function ingresar(credenciales) {
  const respuesta = await api().post('/api/auth/login').send(credenciales)
  return respuesta.body.token
}

// cada archivo empieza con la base de prueba recién cargada desde el seed
export function usarBaseDePrueba() {
  beforeAll(() => reiniciarBase(config.db))
  afterAll(() => pool.end())

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AHORA)
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}
