import { apiRequest } from './api.js'

// Registro público (HU-1). La API repite las validaciones del formulario.
export function registrar(datos) {
  return apiRequest('/auth/registro', { method: 'POST', body: datos })
}

export function correoDisponible(correo) {
  return apiRequest('/auth/correo-disponible', { query: { correo } })
}

// unidades y vínculos del formulario de registro
export function obtenerOpcionesRegistro() {
  return apiRequest('/auth/registro/opciones')
}

// unidades y ambientes de Mi cuenta
export function obtenerOpcionesCuenta() {
  return apiRequest('/cuenta/opciones')
}

// Cambia los datos personales de la cuenta de la sesión; la API ignora correo y rol.
export function actualizarPerfil(cambios) {
  return apiRequest('/cuenta', { method: 'PATCH', body: cambios })
}

// Resumen de "Mi cuenta" (p10) con la encuesta pendiente que abre HU-6. La API saca la cuenta del token; el
// parámetro se conserva para no cambiar a quienes la llaman.
// eslint-disable-next-line no-unused-vars
export function obtenerResumenCuenta(usuario) {
  return apiRequest('/cuenta/resumen')
}
