import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable } from '../repositories/db.js'
import { ServiceError } from './ServiceError.js'
import { solicitar } from './solicitudesAcceso.service.js'

const AHORA = '2026-10-01T15:00:00.000Z'
const CAMILA = 'usr-001'
const JULIO = 'usr-002'
const COLA = 'la cola de atención'

const fallo = (promise) => promise.catch((error) => error)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('solicitudesAcceso.service · solicitar', () => {
  it('registra la solicitud de la cuenta con el recurso que intentó ver', async () => {
    const solicitud = await solicitar(CAMILA, COLA)

    expect(solicitud).toEqual({ id: 'sol-001', usuarioId: CAMILA, recurso: COLA, creadaEn: AHORA })
    expect(readTable('solicitudesAcceso')).toEqual([solicitud])
  })

  it('responde 409 ACCESS_REQUEST_EXISTS si la cuenta ya pidió acceso a ese mismo recurso', async () => {
    await solicitar(CAMILA, COLA)

    const error = await fallo(solicitar(CAMILA, `  ${COLA} `))

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 409,
      code: 'ACCESS_REQUEST_EXISTS',
      message: 'Ya habías solicitado acceso a la cola de atención. Infraestructura y Servicios está revisando tu solicitud.',
    })
    expect(readTable('solicitudesAcceso')).toHaveLength(1)
  })

  it('admite otro recurso de la misma cuenta y el mismo recurso de otra cuenta', async () => {
    await solicitar(CAMILA, COLA)

    await expect(solicitar(CAMILA, 'las invitaciones')).resolves.toMatchObject({ id: 'sol-002' })
    await expect(solicitar(JULIO, COLA)).resolves.toMatchObject({ id: 'sol-003', usuarioId: JULIO })
    expect(readTable('solicitudesAcceso')).toHaveLength(3)
  })

  it.each([[''], ['   '], [undefined], [42], ['x'.repeat(121)]])(
    'responde 400 VALIDATION_ERROR si el recurso no es válido: %s',
    async (recurso) => {
      const error = await fallo(solicitar(CAMILA, recurso))

      expect(error).toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
        fieldErrors: { recurso: 'Indica la sección a la que necesitas acceso.' },
      })
      expect(readTable('solicitudesAcceso')).toEqual([])
    },
  )

  it.each([
    ['no existe', 'usr-999'],
    ['está bloqueada', 'usr-004'],
    ['no se indica', undefined],
  ])('responde 401 UNAUTHENTICATED si la cuenta %s', async (_, usuarioId) => {
    const error = await fallo(solicitar(usuarioId, COLA))

    expect(error).toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Inicia sesión para solicitar acceso.',
    })
    expect(readTable('solicitudesAcceso')).toEqual([])
  })
})
