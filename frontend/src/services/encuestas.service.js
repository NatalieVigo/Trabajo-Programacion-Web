import { db } from '../repositories/db.js'
import { ServiceError, validationError } from './ServiceError.js'

export const DIAS_PLAZO_EDICION = 7

const esPuntajeValido = (valor) => Number.isInteger(valor) && valor >= 1 && valor <= 5

// lo mismo que validaría el servidor antes de guardar
function validarEncuesta(ticket, usuarioId, puntajes) {
  if (!ticket || ticket.usuarioId !== usuarioId) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket tuyo con ese código.')
  }
  if (ticket.estado !== 'cerrado') {
    throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes calificar la atención de un ticket cerrado.')
  }
  if (!puntajes.every(esPuntajeValido)) {
    throw validationError({ puntaje: 'Califica cada aspecto del 1 al 5.' })
  }
}

export async function obtenerEncuestaPorTicket(codigoTicket) {
  const encuestas = await db.get('encuestas')
  const tickets = await db.get('tickets')
  const ticket = tickets.find((t) => t.codigo === codigoTicket || t.id === codigoTicket)
  const found = encuestas.find(
    (e) => e.codigoTicket === codigoTicket || (ticket && (e.ticketId === ticket.id || e.codigoTicket === ticket.codigo)),
  )
  if (!found) return null
  return {
    ...found,
    codigoTicket: found.codigoTicket || ticket?.codigo || codigoTicket,
    puntajeGeneral: found.puntajeGeneral ?? found.puntaje ?? 5,
    rapidez: found.rapidez ?? found.puntaje ?? 5,
    trato: found.trato ?? found.puntaje ?? 5,
    solucion: found.solucion ?? found.puntaje ?? 5,
    comentario: found.comentario || '',
    fechaRespuesta: found.fechaRespuesta || found.respondidaEn || new Date().toISOString(),
  }
}

// crea la encuesta o, si ya existe, la edita
export async function registrarEncuesta({
  codigoTicket,
  usuarioId,
  puntajeGeneral,
  rapidez,
  trato,
  solucion,
  comentario,
}) {
  const encuestas = await db.get('encuestas')
  const tickets = await db.get('tickets')
  const ticket = tickets.find((t) => t.codigo === codigoTicket || t.id === codigoTicket)
  validarEncuesta(ticket, usuarioId, [puntajeGeneral, rapidez, trato, solucion])
  const index = encuestas.findIndex(
    (e) => e.codigoTicket === codigoTicket || (ticket && (e.ticketId === ticket.id || e.codigoTicket === ticket.codigo)),
  )
  const fechaActual = new Date().toISOString()

  if (index >= 0) {
    const fechaRespuesta = new Date(encuestas[index].fechaRespuesta || encuestas[index].respondidaEn)
    const diasDiferencia = (new Date() - fechaRespuesta) / (1000 * 60 * 60 * 24)
    if (diasDiferencia > DIAS_PLAZO_EDICION) {
      throw new Error('El plazo de 7 días para editar esta encuesta ha vencido.')
    }

    encuestas[index] = {
      ...encuestas[index],
      codigoTicket: codigoTicket || encuestas[index].codigoTicket,
      ticketId: ticket?.id || encuestas[index].ticketId || codigoTicket,
      puntaje: puntajeGeneral,
      puntajeGeneral,
      rapidez,
      trato,
      solucion,
      comentario,
      fechaEdicion: fechaActual,
    }
  } else {
    encuestas.push({
      id: `ENC-${Date.now()}`,
      codigoTicket,
      ticketId: ticket?.id || codigoTicket,
      usuarioId,
      puntaje: puntajeGeneral,
      puntajeGeneral,
      rapidez,
      trato,
      solucion,
      comentario: comentario || '',
      fechaRespuesta: fechaActual,
      respondidaEn: fechaActual,
    })
  }

  await db.set('encuestas', encuestas)
  return encuestas.find(
    (e) => e.codigoTicket === codigoTicket || (ticket && (e.ticketId === ticket.id || e.codigoTicket === ticket.codigo)),
  )
}

export async function obtenerEncuestasUsuario(usuarioId) {
  const encuestas = await db.get('encuestas')
  const tickets = await db.get('tickets')
  const usuarios = await db.get('usuarios')

  const respondidas = encuestas
    .filter((e) => e.usuarioId === usuarioId)
    .map((e) => {
      const ticket = tickets.find((t) => t.codigo === e.codigoTicket || t.id === e.ticketId) || {}
      const tecId = ticket.tecnicoId || ticket.asignadoA
      const tecUser = usuarios.find((u) => u.id === tecId)
      const fechaRespStr = e.fechaRespuesta || e.respondidaEn || new Date().toISOString()
      const fechaResp = new Date(fechaRespStr)
      const limiteEdicion = new Date(fechaResp)
      limiteEdicion.setDate(limiteEdicion.getDate() + DIAS_PLAZO_EDICION)
      const editable = new Date() <= limiteEdicion
      const pGen = e.puntajeGeneral ?? e.puntaje ?? 5

      return {
        ...e,
        codigoTicket: e.codigoTicket || ticket.codigo || e.ticketId,
        puntajeGeneral: pGen,
        asunto: ticket.asunto || 'Sin asunto',
        tecnicoNombre: ticket.tecnicoNombre || (tecUser ? `${tecUser.nombres} ${tecUser.apellidos}` : 'No asignado'),
        editable,
        fechaRespuesta: fechaRespStr,
        fechaLimiteEdicion: limiteEdicion.toISOString(),
      }
    })

  const suma = respondidas.reduce((acc, curr) => acc + curr.puntajeGeneral, 0)
  const promedio = respondidas.length > 0 ? (suma / respondidas.length).toFixed(1) : 0

  return {
    encuestas: respondidas,
    promedioGeneral: promedio,
    totalRespondidas: respondidas.length,
  }
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
