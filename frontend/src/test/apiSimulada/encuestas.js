// Simulador de la API (solo pruebas del frontend): las mismas reglas que src/services/encuestas.service.js del
// repositorio del backend, sobre los datos del navegador.
import { readTable, updateTables } from '../../repositories/db.js'
import { ServiceError, validationError } from '../../services/ServiceError.js'
import { esFechaDeCalendario } from '../../utils/fechaLima.js'
import { nextId } from '../../utils/ids.js'

const PLAZO_MS = 7 * 24 * 60 * 60 * 1000
const FILTROS_DE_PUNTAJE = Object.freeze({
  todos: () => true,
  '1_3': (puntaje) => puntaje <= 3,
  '4_5': (puntaje) => puntaje >= 4,
})

const plazoDesde = (fecha) => new Date(new Date(fecha).getTime() + PLAZO_MS)
const redondear = (valor) => Math.round(valor * 10) / 10
const promedio = (valores) => (valores.length ? redondear(valores.reduce((a, b) => a + b, 0) / valores.length) : null)
const nombreCorto = (persona) => (persona ? `${persona.nombres.split(' ')[0]} ${persona.apellidos}`.trim() : 'Sin técnico')

function ticketPropio(tickets, codigo, cuenta) {
  const ticket = tickets.find((t) => t.codigo === codigo)
  if (!ticket || ticket.usuarioId !== cuenta.id) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket tuyo con ese código.')
  }
  return ticket
}

function encuestaPublica(encuesta, codigoTicket, ahora = Date.now()) {
  const fechaLimiteEdicion = plazoDesde(encuesta.respondidaEn)
  return {
    id: encuesta.id,
    codigoTicket,
    puntajeGeneral: encuesta.puntaje,
    rapidez: encuesta.rapidez,
    trato: encuesta.trato,
    solucion: encuesta.solucion,
    comentario: encuesta.comentario ?? '',
    fechaRespuesta: encuesta.respondidaEn,
    editadaEn: encuesta.editadaEn ?? null,
    fechaLimiteEdicion: fechaLimiteEdicion.toISOString(),
    editable: ahora <= fechaLimiteEdicion.getTime(),
  }
}

function validarRespuesta({ puntajeGeneral, rapidez, trato, solucion, comentario = '' } = {}) {
  const errores = {}
  for (const [campo, valor] of Object.entries({ puntajeGeneral, rapidez, trato, solucion })) {
    if (!Number.isInteger(valor) || valor < 1 || valor > 5) errores[campo] = 'Califica del 1 al 5.'
  }
  if (typeof comentario !== 'string' || comentario.trim().length > 500) {
    errores.comentario = 'El comentario admite hasta 500 caracteres.'
  }
  if (Object.keys(errores).length > 0) throw validationError(errores)
  return { puntaje: puntajeGeneral, rapidez, trato, solucion, comentario: comentario.trim() }
}

export function obtenerEncuesta(codigo, cuenta) {
  const ticket = ticketPropio(readTable('tickets'), codigo, cuenta)
  const encuesta = readTable('encuestas').find((e) => e.ticketId === ticket.id)
  if (encuesta) {
    const publica = encuestaPublica(encuesta, ticket.codigo)
    return { encuesta: publica, abierta: publica.editable, plazoHasta: publica.fechaLimiteEdicion }
  }
  const plazoHasta = ticket.cerradoEn ? plazoDesde(ticket.cerradoEn) : null
  return {
    encuesta: null,
    abierta: ticket.estado === 'cerrado' && Date.now() <= plazoHasta?.getTime(),
    plazoHasta: plazoHasta?.toISOString() ?? null,
  }
}

// crea la encuesta o, si ya existe, la edita (la API real responde 201 al crearla)
export function responderEncuesta(codigo, datos, cuenta) {
  return updateTables(['encuestas'], (db) => {
    const ticket = ticketPropio(db.tickets, codigo, cuenta)
    if (ticket.estado !== 'cerrado') {
      throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes calificar la atención de un ticket cerrado.')
    }
    const respuesta = validarRespuesta(datos)
    const ahora = Date.now()
    const fecha = new Date(ahora).toISOString()
    const actual = db.encuestas.find((e) => e.ticketId === ticket.id)
    if (actual) {
      if (ahora > plazoDesde(actual.respondidaEn).getTime()) {
        throw new ServiceError(409, 'SURVEY_EDIT_EXPIRED', 'El plazo de 7 días para editar esta encuesta venció.')
      }
      Object.assign(actual, respuesta, { editadaEn: fecha })
      return encuestaPublica(actual, ticket.codigo, ahora)
    }
    if (ahora > plazoDesde(ticket.cerradoEn).getTime()) {
      throw new ServiceError(409, 'SURVEY_EXPIRED', 'El plazo de 7 días para responder esta encuesta venció.')
    }
    const nueva = {
      id: nextId('enc', db.encuestas),
      ticketId: ticket.id,
      usuarioId: cuenta.id,
      ...respuesta,
      respondidaEn: fecha,
      editadaEn: null,
    }
    db.encuestas.push(nueva)
    return encuestaPublica(nueva, ticket.codigo, ahora)
  })
}

// cada encuesta con su ticket, el técnico asignado y la categoría
function conTicket(encuestas) {
  const tickets = readTable('tickets')
  const usuarios = readTable('usuarios')
  const categorias = readTable('categorias')
  return encuestas.flatMap((e) => {
    const ticket = tickets.find((t) => t.id === e.ticketId)
    if (!ticket) return []
    return [{
      ...e,
      ticket: {
        ...ticket,
        tecnico: usuarios.find((u) => u.id === ticket.asignadoA) ?? null,
        categoria: categorias.find((c) => c.id === ticket.categoriaId) ?? null,
      },
    }]
  })
}

const masRecientePrimero = (a, b) => b.respondidaEn.localeCompare(a.respondidaEn) || a.id.localeCompare(b.id)

export function listarMisEncuestas(cuenta) {
  const filas = conTicket(readTable('encuestas').filter((e) => e.usuarioId === cuenta.id))
    .sort(masRecientePrimero)
    .map((e) => ({
      ...encuestaPublica(e, e.ticket.codigo),
      asunto: e.ticket.asunto || 'Sin asunto',
      categoria: e.ticket.categoria?.nombre ?? null,
      tecnicoNombre: nombreCorto(e.ticket.tecnico),
    }))
  return { encuestas: filas, totalRespondidas: filas.length, promedioGeneral: promedio(filas.map((f) => f.puntajeGeneral)) ?? 0 }
}

function promedios(encuestas) {
  return {
    general: promedio(encuestas.map((e) => e.puntaje)),
    rapidez: promedio(encuestas.map((e) => e.rapidez)),
    trato: promedio(encuestas.map((e) => e.trato)),
    solucion: promedio(encuestas.map((e) => e.solucion)),
    encuestasCount: encuestas.length,
  }
}

function agruparPor(encuestas, clave) {
  const grupos = new Map()
  for (const encuesta of encuestas) {
    const valor = clave(encuesta)
    if (valor) grupos.set(valor, [...(grupos.get(valor) ?? []), encuesta])
  }
  return grupos
}

function categoriaPrincipal(encuestas) {
  const [primera] = [...agruparPor(encuestas, (e) => e.ticket.categoria?.nombre)]
    .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))
  return primera?.[0] ?? 'Sin categoría'
}

export function reporteSatisfaccion({ desde, hasta, puntaje }) {
  if (!esFechaDeCalendario(desde) || !esFechaDeCalendario(hasta) || desde > hasta) {
    throw validationError({ periodo: 'Elige fechas válidas y una fecha final igual o posterior a la inicial.' })
  }
  const filtro = FILTROS_DE_PUNTAJE[puntaje ?? 'todos']
  if (!filtro) throw validationError({ puntaje: 'Elige todos, 1 a 3 o 4 a 5.' })
  const inicio = Date.parse(`${desde}T00:00:00.000-05:00`)
  const fin = Date.parse(`${hasta}T23:59:59.000-05:00`)
  const enPeriodo = (fecha) => Boolean(fecha) && Date.parse(fecha) >= inicio && Date.parse(fecha) <= fin

  const encuestas = readTable('encuestas')
  const respondidas = conTicket(encuestas.filter((e) => enPeriodo(e.respondidaEn))).sort(masRecientePrimero)
  const cerrados = readTable('tickets').filter((t) => t.estado === 'cerrado' && enPeriodo(t.cerradoEn))
  const conEncuesta = cerrados.filter((t) => encuestas.some((e) => e.ticketId === t.id))

  const tablaTecnicos = [...agruparPor(respondidas, (e) => e.ticket.asignadoA)]
    .map(([tecnicoId, grupo]) => ({
      tecnicoId,
      tecnicoNombre: nombreCorto(grupo[0].ticket.tecnico),
      categoriaPrincipal: categoriaPrincipal(grupo),
      ...promedios(grupo),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre))
  const porCategoria = [...agruparPor(respondidas, (e) => e.ticket.categoriaId)]
    .map(([categoriaId, grupo]) => ({ categoriaId, categoria: grupo[0].ticket.categoria?.nombre ?? 'Sin categoría', ...promedios(grupo) }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria))
  const { rapidez, trato, solucion } = promedios(respondidas)
  const comentarios = respondidas
    .filter((e) => e.comentario?.trim() && filtro(e.puntaje))
    .map((e) => ({
      id: e.id,
      puntaje: e.puntaje,
      categoria: e.ticket.categoria?.nombre ?? 'Sin categoría',
      tecnicoNombre: nombreCorto(e.ticket.tecnico),
      fecha: e.respondidaEn,
      comentario: e.comentario,
    }))

  return {
    rango: { desde, hasta },
    totalRespondidas: respondidas.length,
    promedioGeneral: promedio(respondidas.map((e) => e.puntaje)) ?? 0,
    tasaRespuesta: cerrados.length ? Math.round((conEncuesta.length / cerrados.length) * 100) : 0,
    promedioPorAspecto: { rapidez, trato, solucion },
    tablaTecnicos,
    porCategoria,
    comentarios,
  }
}
