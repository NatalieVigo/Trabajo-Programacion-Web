import { vi } from 'vitest'
import { API_URL } from '../services/api.js'
import { fetchSimulado } from './apiSimulada/index.js'

// el simulador sigue respondiendo, pero queda registro de cada petición
export function espiarApi() {
  const fetch = vi.fn(fetchSimulado)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

// lo que mandó el navegador en la última llamada, sin la parte fija de la URL
export function ultimaPeticion(fetch) {
  const [url, { method, headers, body }] = fetch.mock.lastCall
  return {
    ruta: url.replace(API_URL, ''),
    method,
    token: headers.Authorization,
    datos: body === undefined ? undefined : JSON.parse(body),
  }
}
