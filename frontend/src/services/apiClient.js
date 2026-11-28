import { sessionRepository } from '../repositories/session.repository.js'
import { ServiceError } from './ServiceError.js'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export async function apiFetch(path, { method = 'GET', params, body } = {}) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const sesion = sessionRepository.load()
  const headers = {
    'Content-Type': 'application/json',
  }
  if (sesion?.usuarioId) {
    headers['x-usuario-id'] = sesion.usuarioId
  }

  let response
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    throw new ServiceError(503, 'NETWORK_ERROR', 'No pudimos conectarnos con el servidor.', null, { cause })
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ServiceError(
      response.status,
      payload?.code || 'API_ERROR',
      payload?.message || 'Ocurrió un error al consultar el servidor.',
      payload?.fieldErrors || null,
      { details: payload?.details },
    )
  }

  return payload
}
