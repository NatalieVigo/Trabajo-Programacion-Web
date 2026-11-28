import { apiRequest } from './api.js'

// Usa el mismo cliente que las demás historias: manda el token de la sesión (Authorization: Bearer) y arma los
// errores de la API igual. Los parámetros vacíos no se envían.
export function apiFetch(path, { method = 'GET', params, body } = {}) {
  const query = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  const ruta = path.startsWith('/') ? path : `/${path}`
  return apiRequest(ruta, { method, body, query: Object.keys(query).length > 0 ? query : undefined })
}
