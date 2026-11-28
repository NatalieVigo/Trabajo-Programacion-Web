import { apiRequest } from './api.js'
import { ServiceError } from './ServiceError.js'

// Atención y cierre (HU-5). Las reglas viven en la API (/api/atencion del repositorio del backend); quién pide
// sale del token, así que el usuarioId que mandan las páginas ya no hace falta.

function ruta(codigo, sufijo = '') {
  const limpio = String(codigo ?? '').trim()
  // sin código la ruta sería /atencion/, que es la lista del técnico: se responde como a un código que no existe
  if (!limpio) throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket con ese código.')
  return `/atencion/${encodeURIComponent(limpio)}${sufijo}`
}

// Atención de un ticket (p25). Quien lo reportó solo recibe los comentarios públicos.
export async function obtenerAtencion(codigo) {
  return apiRequest(ruta(codigo))
}

// comentario público o nota interna; devuelve la atención actualizada
export async function agregarEntrada(codigo, datos) {
  return apiRequest(ruta(codigo, '/bitacora'), { method: 'POST', body: datos })
}

// solo el técnico asignado; la espera pide motivo y fecha de retorno (p26)
export async function cambiarEstado(codigo, datos) {
  return apiRequest(ruta(codigo, '/estado'), { method: 'PATCH', body: datos })
}

// cierra con la solución (p26); desde ahí quien lo reportó ya puede responder la encuesta
export async function cerrarTicket(codigo, datos) {
  return apiRequest(ruta(codigo, '/cierre'), { method: 'PATCH', body: datos })
}

// historial completo del ticket, con el tiempo que pasó en cada estado (p27)
export async function obtenerHistorial(codigo) {
  return apiRequest(ruta(codigo, '/historial'))
}

// tickets que tiene o tuvo el técnico, primero los de actividad más reciente (p24)
export function listarAtendidos() {
  return apiRequest('/atencion')
}

// datos del ticket para la vista de la encuesta (HU-6); null si no existe o no es de quien pregunta
export async function obtenerTicketPorCodigo(codigoTicket) {
  if (!codigoTicket) return null
  let ticket
  try {
    ;({ ticket } = await obtenerAtencion(codigoTicket))
  } catch {
    return null
  }
  return {
    ...ticket,
    usuarioId: ticket.solicitante?.id ?? null,
    asignadoA: ticket.tecnico?.id ?? null,
    categoriaId: ticket.categoria?.id ?? null,
    ambienteId: ticket.ambiente?.id ?? null,
    categoriaNombre: ticket.categoria?.nombre || 'General',
    ambienteCodigo: ticket.ambiente?.codigo || 'Ambiente',
    tecnicoNombre: ticket.tecnico ? `${ticket.tecnico.nombres} ${ticket.tecnico.apellidos}` : 'No asignado',
    fechaCierre: ticket.cerradoEn ? new Date(ticket.cerradoEn).toLocaleDateString('es-PE') : 'Recientemente',
  }
}
