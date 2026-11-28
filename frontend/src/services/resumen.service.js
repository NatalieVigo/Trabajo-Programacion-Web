import { apiRequest } from './api.js'

// Contadores de la cabecera, del menú lateral y de la bienvenida (HU-1), según el rol de la sesión.
// El parámetro usuario se conserva para no cambiar a quienes la llaman; la API saca la cuenta del token.
// eslint-disable-next-line no-unused-vars
export function obtenerContadores(usuario) {
  return apiRequest('/cuenta/contadores')
}
