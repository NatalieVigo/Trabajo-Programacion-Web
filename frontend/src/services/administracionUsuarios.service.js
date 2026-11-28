import { apiRequest } from './api.js'

// Gestión de usuarios (HU-7). Las reglas viven en la API y solo responde al supervisor; quién hace la acción sale del
// token de la sesión.

// la lista de cuentas, el menú y los contadores se vuelven a leer cuando una cuenta cambia
function anunciarCambio() {
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
  window.dispatchEvent(new Event('mesa-ayuda:cuentas-actualizadas'))
}

const ruta = (cuentaId, accion = '') => `/usuarios/${encodeURIComponent(cuentaId)}${accion}`

// todas las cuentas (p32); los filtros, la búsqueda y la paginación se hacen en la vista
export function listarCuentas() {
  return apiRequest('/usuarios')
}

// la ficha de la cuenta con su historial de reportes (p33): { cuenta, ambienteHabitual, reportes, resumen }
export function obtenerFichaCuenta(cuentaId) {
  return apiRequest(ruta(cuentaId))
}

// devuelve { id, nombre } de la cuenta bloqueada
export async function bloquearCuenta(cuentaId, { motivo, notificar = false }) {
  const resultado = await apiRequest(ruta(cuentaId, '/bloqueo'), { method: 'PATCH', body: { motivo, notificar } })
  anunciarCambio()
  return resultado
}

export async function desbloquearCuenta(cuentaId) {
  const resultado = await apiRequest(ruta(cuentaId, '/desbloqueo'), { method: 'PATCH' })
  anunciarCambio()
  return resultado
}
