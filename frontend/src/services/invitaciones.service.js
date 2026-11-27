import { apiRequest } from './api.js'

const rutaDeLaInvitacion = (token) => `/invitaciones/${encodeURIComponent(token)}`

// Alta por invitación (HU-1): el token del enlace es el acceso del invitado.
export function obtenerPorToken(token) {
  return apiRequest(rutaDeLaInvitacion(token))
}

// categorías activas para elegir la especialidad
export async function obtenerCategorias(token) {
  const { categorias } = await apiRequest(`${rutaDeLaInvitacion(token)}/opciones`)
  return categorias
}

export function aceptar(token, datos) {
  return apiRequest(`${rutaDeLaInvitacion(token)}/aceptar`, { method: 'POST', body: datos })
}

export function rechazar(token) {
  return apiRequest(`${rutaDeLaInvitacion(token)}/rechazar`, { method: 'POST' })
}

// solo el supervisor; la API toma quién invita del token de la sesión
export function crear(datos) {
  return apiRequest('/invitaciones', { method: 'POST', body: datos })
}
