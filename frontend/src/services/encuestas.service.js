import { db } from '../repositories/db.js'
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

// Reporte de satisfacción para el supervisor (HU-6).
export async function obtenerReporteSatisfaccionSupervisor({
  fechaInicio,
  fechaFin,
  filtroPuntajeComentario = 'todos',
} = {}) {
  const encuestas = await db.get('encuestas')
  const tickets = await db.get('tickets')
  const usuarios = await db.get('usuarios')
  const categorias = (await db.get('categorias')) || []

  const encuestasFiltradas = encuestas.filter((e) => {
    if (!fechaInicio && !fechaFin) return true
    const fechaStr = e.fechaRespuesta || e.respondidaEn
    if (!fechaStr) return true
    const f = new Date(fechaStr)
    if (fechaInicio && f < new Date(fechaInicio)) return false
    if (fechaFin && f > new Date(fechaFin)) return false
    return true
  })

  // métricas por técnico
  const tecnicosMap = {}

  encuestasFiltradas.forEach((enc) => {
    const ticket = tickets.find((t) => t.codigo === enc.codigoTicket || t.id === enc.ticketId)
    if (!ticket) return

    const tecId = ticket.tecnicoId || ticket.asignadoA
    if (!tecId) return

    if (!tecnicosMap[tecId]) {
      const tecUser = usuarios.find((u) => u.id === tecId)
      const cat = categorias.find((c) => c.id === ticket.categoriaId)
      tecnicosMap[tecId] = {
        tecnicoId: tecId,
        tecnicoNombre: ticket.tecnicoNombre || (tecUser ? `${tecUser.nombres} ${tecUser.apellidos}` : 'Técnico'),
        categoriaPrincipal: ticket.categoriaNombre || cat?.nombre || 'General',
        cantEncuestas: 0,
        sumGeneral: 0,
        sumRapidez: 0,
        sumTrato: 0,
        sumSolucion: 0,
      }
    }

    const tData = tecnicosMap[tecId]
    const pGeneral = enc.puntajeGeneral ?? enc.puntaje ?? 5
    const pRapidez = enc.rapidez ?? pGeneral
    const pTrato = enc.trato ?? pGeneral
    const pSolucion = enc.solucion ?? pGeneral

    tData.cantEncuestas += 1
    tData.sumGeneral += pGeneral
    tData.sumRapidez += pRapidez
    tData.sumTrato += pTrato
    tData.sumSolucion += pSolucion
  })

  const tablaTecnicos = Object.values(tecnicosMap).map((t) => ({
    tecnicoNombre: t.tecnicoNombre,
    categoriaPrincipal: t.categoriaPrincipal,
    general: (t.sumGeneral / t.cantEncuestas).toFixed(1),
    rapidez: (t.sumRapidez / t.cantEncuestas).toFixed(1),
    trato: (t.sumTrato / t.cantEncuestas).toFixed(1),
    solucion: (t.sumSolucion / t.cantEncuestas).toFixed(1),
    encuestasCount: t.cantEncuestas,
  }))

  // comentarios del panel lateral
  let comentarios = encuestasFiltradas
    .filter((e) => e.comentario && e.comentario.trim().length > 0)
    .map((e) => {
      const ticket = tickets.find((t) => t.codigo === e.codigoTicket || t.id === e.ticketId) || {}
      const tecId = ticket.tecnicoId || ticket.asignadoA
      const tecUser = usuarios.find((u) => u.id === tecId)
      const cat = categorias.find((c) => c.id === ticket.categoriaId)
      const pGen = e.puntajeGeneral ?? e.puntaje ?? 5
      return {
        id: e.id,
        puntaje: pGen,
        categoria: ticket.categoriaNombre || cat?.nombre || 'Atención',
        tecnicoNombre: ticket.tecnicoNombre || (tecUser ? `${tecUser.nombres} ${tecUser.apellidos}` : 'Técnico'),
        fecha: e.fechaRespuesta || e.respondidaEn || new Date().toISOString(),
        comentario: e.comentario,
      }
    })

  if (filtroPuntajeComentario === '1_3') {
    comentarios = comentarios.filter((c) => c.puntaje >= 1 && c.puntaje <= 3)
  } else if (filtroPuntajeComentario === '4_5') {
    comentarios = comentarios.filter((c) => c.puntaje >= 4)
  }

  const totalRespondidas = encuestasFiltradas.length
  const sumaGen = encuestasFiltradas.reduce((a, c) => a + (c.puntajeGeneral ?? c.puntaje ?? 5), 0)
  const promedioGeneral = totalRespondidas > 0 ? (sumaGen / totalRespondidas).toFixed(1) : 0

  return {
    tablaTecnicos,
    comentarios,
    totalRespondidas,
    promedioGeneral,
    tasaRespuesta: 62, // fijo por ahora
  }
}
