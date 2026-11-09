import { describe, expect, it, vi } from 'vitest'
import { sessionRepository } from '../repositories/session.repository.js'
import { API_URL, apiRequest } from './api.js'
import { ServiceError } from './ServiceError.js'

const json = (status, datos) => new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } })

function responderCon(respuesta) {
  const fetch = vi.fn().mockResolvedValue(respuesta)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const fallo = (promise) => promise.catch((error) => error)

describe('apiRequest', () => {
  it('manda el cuerpo en JSON con el token de la sesión y devuelve la respuesta', async () => {
    sessionRepository.save({ usuarioId: 'usr-001', iniciadaEn: '2026-10-01T15:00:00.000Z', token: 'abc' })
    const fetch = responderCon(json(200, { ok: true }))

    const datos = await apiRequest('/cuenta', { method: 'PATCH', body: { telefono: '911222333' } })

    expect(datos).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/cuenta`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
      body: '{"telefono":"911222333"}',
    })
  })

  it('sin sesión no manda Authorization y arma la consulta', async () => {
    const fetch = responderCon(json(200, { disponible: true }))

    await apiRequest('/auth/correo-disponible', { query: { correo: 'a@ulima.edu.pe' } })

    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/auth/correo-disponible?correo=a%40ulima.edu.pe`, {
      method: 'GET',
      headers: {},
      body: undefined,
    })
  })

  it('una respuesta 204 devuelve null', async () => {
    responderCon(new Response(null, { status: 204 }))

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeNull()
  })

  it('convierte el error de la API en ServiceError con su status, código y errores de campo', async () => {
    responderCon(json(409, {
      code: 'EMAIL_TAKEN',
      message: 'Ya existe una cuenta con este correo.',
      fieldErrors: { correo: 'Ya existe una cuenta con este correo.' },
      details: null,
    }))

    const error = await fallo(apiRequest('/auth/registro', { method: 'POST', body: {} }))

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'Ya existe una cuenta con este correo.',
      fieldErrors: { correo: 'Ya existe una cuenta con este correo.' },
    })
  })

  it('si la respuesta de error no trae el formato de la API usa el mensaje genérico', async () => {
    responderCon(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await fallo(apiRequest('/cuenta'))

    expect(error).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado. Inténtalo otra vez.' })
  })

  it('si el servidor no responde avisa que no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await fallo(apiRequest('/cuenta'))

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    expect(error.message).toMatch(/No pudimos conectar con el servidor/)
  })
})
