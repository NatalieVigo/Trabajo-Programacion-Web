import { apiRequest } from './api.js'

// Sedes, pabellones y ambientes (HU-2). Las reglas viven en la API; quién es el supervisor sale del token.

const ruta = (recurso, id) => `/${recurso}/${encodeURIComponent(id)}`

// Sedes y pabellones: cada sede trae sus pabellones

export function listarSedes() {
  return apiRequest('/sedes')
}

export function crearSede(datos) {
  return apiRequest('/sedes', { method: 'POST', body: datos })
}

export function actualizarSede(id, datos) {
  return apiRequest(ruta('sedes', id), { method: 'PATCH', body: datos })
}

export function eliminarSede(id) {
  return apiRequest(ruta('sedes', id), { method: 'DELETE' })
}

export function crearPabellon(datos) {
  return apiRequest('/pabellones', { method: 'POST', body: datos })
}

export function actualizarPabellon(id, datos) {
  return apiRequest(ruta('pabellones', id), { method: 'PATCH', body: datos })
}

export function eliminarPabellon(id) {
  return apiRequest(ruta('pabellones', id), { method: 'DELETE' })
}

// Ambientes

export function listarAmbientes() {
  return apiRequest('/ambientes')
}

export function crearAmbiente(datos) {
  return apiRequest('/ambientes', { method: 'POST', body: datos })
}

export function actualizarAmbiente(id, datos) {
  return apiRequest(ruta('ambientes', id), { method: 'PATCH', body: datos })
}

export function eliminarAmbiente(id) {
  return apiRequest(ruta('ambientes', id), { method: 'DELETE' })
}
