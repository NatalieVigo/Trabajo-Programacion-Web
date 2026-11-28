import { apiRequest } from './api.js'

export function listarMisTickets() {
  return apiRequest('/tickets')
}

export function buscarTicketEnCurso({ ambienteId, categoriaId }) {
  return apiRequest('/tickets/duplicados', { query: { ambienteId, categoriaId } })
}

export function crearTicket(datos) {
  return apiRequest('/tickets', { method: 'POST', body: datos })
}

export function cancelarTicket(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/cancelacion`, { method: 'PATCH' })
}

export function reabrirTicket(ticketId, motivo) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/reapertura`, {
    method: 'PATCH',
    body: { motivo },
  })
}
