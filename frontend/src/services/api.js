import { sessionRepository } from '../repositories/session.repository.js'
import { ServiceError, errorInesperado } from './ServiceError.js'

// URL de la API de Express; se cambia con VITE_API_URL (ver .env.example)
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo otra vez.'

function armarUrl(ruta, query) {
  return query ? `${API_URL}${ruta}?${new URLSearchParams(query)}` : `${API_URL}${ruta}`
}

// la API responde los errores como { code, message, fieldErrors, details }
function errorDeLaApi(status, datos) {
  if (!datos?.code) return errorInesperado()
  return new ServiceError(status, datos.code, datos.message, datos.fieldErrors ?? null, { details: datos.details ?? null })
}

// Llama a la API con el token de la sesión guardada y devuelve el JSON de la respuesta.
export async function apiRequest(ruta, { method = 'GET', body, query } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = sessionRepository.read()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(armarUrl(ruta, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    throw new ServiceError(0, 'NETWORK_ERROR', SIN_CONEXION, null, { cause: error })
  }

  if (respuesta.status === 204) return null
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw errorDeLaApi(respuesta.status, datos)
  return datos
}
