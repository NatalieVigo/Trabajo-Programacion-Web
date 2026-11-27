import { apiRequest } from './api.js'
import { simulateRequest } from './request.js'
import { resumenDeCuenta } from './resumen.service.js'

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

// Lee tickets y encuestas, que siguen en el navegador hasta que HU-3 y HU-6 pasen a la API
// (entonces será GET /api/cuenta/resumen). HU-6 todavía pasa solo el id del usuario.
export function obtenerResumenCuenta(usuario) {
  const cuenta = typeof usuario === 'string' ? { id: usuario, rol: 'usuario' } : usuario
  return simulateRequest(() => resumenDeCuenta(cuenta))
}
