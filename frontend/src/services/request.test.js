import { describe, expect, it } from 'vitest'
import { simulateRequest } from './request.js'
import { ServiceError } from './ServiceError.js'

describe('simulateRequest', () => {
  it('devuelve una copia profunda del resultado, como si viajara por la red', async () => {
    const original = { usuario: { nombres: 'Camila' }, especialidades: ['cat-01'] }

    const respuesta = await simulateRequest(() => original)

    expect(respuesta).toEqual(original)
    expect(respuesta).not.toBe(original)
    expect(respuesta.usuario).not.toBe(original.usuario)
  })

  it('acepta operaciones asíncronas', async () => {
    await expect(simulateRequest(async () => 'listo')).resolves.toBe('listo')
  })

  it('propaga los ServiceError tal cual', async () => {
    const error = new ServiceError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con este correo.', {
      correo: 'Ya existe una cuenta con este correo.',
    })

    await expect(simulateRequest(() => Promise.reject(error))).rejects.toBe(error)
  })

  it('convierte un error inesperado en un 500 que conserva la causa', async () => {
    const causa = new Error('disco lleno')

    const error = await simulateRequest(() => {
      throw causa
    }).catch((reason) => reason)

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL_ERROR', fieldErrors: null, details: null })
    expect(error.cause).toBe(causa)
  })
})

describe('ServiceError', () => {
  it('expone status, code, fieldErrors y details', () => {
    const error = new ServiceError(423, 'ACCOUNT_LOCKED', 'Cuenta bloqueada.', null, {
      details: { bloqueadoHasta: '2026-09-30T15:42:00.000Z' },
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ServiceError')
    expect(error.message).toBe('Cuenta bloqueada.')
    expect(error).toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED', fieldErrors: null })
    expect(error.details).toEqual({ bloqueadoHasta: '2026-09-30T15:42:00.000Z' })
  })
})
