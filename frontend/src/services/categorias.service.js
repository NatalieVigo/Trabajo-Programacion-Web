import { apiRequest } from './api.js'

// Categorías y subcategorías (HU-2). Las reglas viven en la API; quién es el supervisor sale del token.

const rutaDe = (id) => `/categorias/${encodeURIComponent(id)}`

// catálogo completo, con contadores y si cada elemento se puede eliminar
export function listar() {
  return apiRequest('/categorias')
}

export function obtener(id) {
  return apiRequest(rutaDe(id))
}

// si viene categoriaId se crea una subcategoría de ella
export function crear(datos) {
  return apiRequest('/categorias', { method: 'POST', body: datos })
}

// con tickets en curso, desactivar pide confirmado: true
export function actualizar(id, datos) {
  return apiRequest(rutaDe(id), { method: 'PATCH', body: datos })
}

export function eliminar(id) {
  return apiRequest(rutaDe(id), { method: 'DELETE' })
}

export function cambiarEstado(id, activa, { confirmado = false } = {}) {
  return apiRequest(`${rutaDe(id)}/estado`, { method: 'PATCH', body: { activa, confirmado } })
}

// lo que se ofrece al registrar tickets (HU-3): solo lo activo
export function listarDisponibles() {
  return apiRequest('/categorias/disponibles')
}
