import { apiRequest } from './api.js'

// Cola y asignación (HU-4). Las reglas viven en la API; quién hace la acción sale del token de la sesión.
// Los parámetros usuarioId y supervisorId se conservan para no cambiar las páginas que llaman a estas funciones.

export const HORAS_POR_PRIORIDAD = Object.freeze({
  critica: 2,
  alta: 8,
  media: 24,
  baja: 72,
})

// la cola, la bandeja y los contadores del encabezado se vuelven a leer cuando algo cambia
function avisarCambio() {
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
}

async function accion(ruta, method, body) {
  const resultado = await apiRequest(ruta, { method, body })
  avisarCambio()
  return resultado
}

// cola general del supervisor (p22): { tickets, tecnicos, categorias, ambientes }
// eslint-disable-next-line no-unused-vars
export function listarCola(usuarioId) {
  return apiRequest('/cola')
}

// bandeja del técnico (p24): { tecnico, tickets, disponibles }
// eslint-disable-next-line no-unused-vars
export function listarBandeja(usuarioId) {
  return apiRequest('/cola/bandeja')
}

// asigna o reasigna; devuelve cuántos tickets cambiaron
// eslint-disable-next-line no-unused-vars
export async function asignarTickets(ids, tecnicoId, nota, supervisorId) {
  const { actualizados } = await accion('/cola/asignaciones', 'POST', { ids, tecnicoId, nota })
  return actualizados
}

// eslint-disable-next-line no-unused-vars
export async function cambiarPrioridadTickets(ids, prioridad, motivo, supervisorId) {
  const { actualizados } = await accion('/cola/prioridad', 'PATCH', { ids, prioridad, motivo })
  return actualizados
}

// eslint-disable-next-line no-unused-vars
export async function devolverTickets(ids, supervisorId) {
  const { actualizados } = await accion('/cola/devoluciones', 'POST', { ids })
  return actualizados
}

// devuelve el id del ticket que el técnico se asignó
// eslint-disable-next-line no-unused-vars
export async function autoasignarTicket(ticketId, usuarioId) {
  const { id } = await accion(`/cola/${encodeURIComponent(ticketId)}/autoasignacion`, 'POST')
  return id
}
