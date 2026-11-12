import { apiRequest } from './api.js'

// Matriz de técnicos por categoría (HU-2).
export function obtenerMatriz() {
  return apiRequest('/habilitaciones')
}

// cambios es { tecnicoId: [categoriaIds] }; los técnicos que no vienen no se tocan
export function guardarMatriz(cambios) {
  return apiRequest('/habilitaciones', { method: 'PUT', body: cambios })
}
