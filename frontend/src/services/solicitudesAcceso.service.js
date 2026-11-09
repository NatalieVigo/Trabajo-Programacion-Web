import { apiRequest } from './api.js'

// Pedido de acceso desde la vista 403 (HU-1). La cuenta sale del token de la sesión.
export function solicitar(recurso) {
  return apiRequest('/solicitudes-acceso', { method: 'POST', body: { recurso } })
}
