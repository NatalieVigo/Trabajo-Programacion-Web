import { apiRequest } from './api.js'

// Encuesta de satisfacción (HU-6). Las reglas viven en la API; quién responde sale del token de la sesión.
// Se responde hasta 7 días después del cierre y se edita hasta 7 días después de responder.
export const DIAS_PLAZO_EDICION = 7

const ruta = (codigoTicket) => `/encuestas/${encodeURIComponent(codigoTicket)}`

// la encuesta de un ticket propio, o null si todavía no la responde (o el ticket no es suyo)
export async function obtenerEncuestaPorTicket(codigoTicket) {
  try {
    const { encuesta } = await apiRequest(ruta(codigoTicket))
    return encuesta
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

// crea la encuesta o, si ya existe, la edita
export async function registrarEncuesta({ codigoTicket, puntajeGeneral, rapidez, trato, solucion, comentario = '' }) {
  const encuesta = await apiRequest(ruta(codigoTicket), {
    method: 'PUT',
    body: { puntajeGeneral, rapidez, trato, solucion, comentario },
  })
  // el contador de encuestas pendientes del menú se vuelve a leer
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
  return encuesta
}

// mis encuestas (p28): { encuestas, totalRespondidas, promedioGeneral }
export function obtenerEncuestasUsuario() {
  return apiRequest('/encuestas')
}

// satisfacción por técnico y categoría del periodo (p29), con los comentarios filtrados por puntaje
export function obtenerReporteSatisfaccionSupervisor({ desde, hasta, filtroPuntajeComentario = 'todos' }) {
  return apiRequest('/encuestas/satisfaccion', { query: { desde, hasta, puntaje: filtroPuntajeComentario } })
}
