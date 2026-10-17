import { bitacoraRepository, estadoDeTicketRepository, historialRepository } from '../repositories/atencion.repository.js'
import {
  ambientesRepository,
  categoriasRepository,
  pabellonesRepository,
  sedesRepository,
  subcategoriasRepository,
} from '../repositories/catalogo.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import {
  normalizeTexto,
  validateCambioEstado,
  validateCierre,
  validateEntrada,
  validateNuevoEstado,
} from '../utils/atencionValidators.js'
import { HORA_MS } from '../utils/duracion.js'
import { esTransicionValida, sePuedeCerrar, transicionesDesde } from '../utils/estadosTicket.js'
import { finDelDiaEnLima } from '../utils/fechaLima.js'
import { formatEstado } from '../utils/format.js'
import { nextId } from '../utils/ids.js'
import { hasErrors } from '../utils/validators.js'
import { esSuTecnico, exigirCuentaActiva, permisosSobre } from './atencionAcceso.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { etapasDe, tiempoPorEstado, tiemposDe } from './tiemposDeAtencion.js'

// si tienen la misma fecha, desempata el orden en que se registraron
const porAntiguedad = (a, b) => a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id)

// nunca se devuelve el correo ni la contraseña
function persona(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  return usuario && { id: usuario.id, nombres: usuario.nombres, apellidos: usuario.apellidos, rol: usuario.rol }
}

function buscarTicket(codigo) {
  const buscado = String(codigo ?? '').trim().toUpperCase()
  const ticket = ticketsRepository.findOne({ codigo: buscado })
  if (!ticket) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket con ese código.')
  }
  return ticket
}

const referencia = (fila) => (fila ? { id: fila.id, nombre: fila.nombre } : null)

function ambienteDe(ticket) {
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  const pabellon = ambiente ? pabellonesRepository.findById(ambiente.pabellonId) : null
  const codigo = ambiente?.codigo ?? ticket.ambienteCodigo ?? 'Sin ambiente'
  const delAmbiente = ambiente
    ? ticketsRepository.findAll({ ambienteId: ambiente.id })
    : ticketsRepository.findAll().filter(
        (otro) => (otro.ambienteCodigo ?? '').trim().toLocaleLowerCase('es') === codigo.trim().toLocaleLowerCase('es'),
      )
  const cierres = delAmbiente.map(({ cerradoEn }) => cerradoEn).filter(Boolean)
  return {
    id: ambiente?.id ?? ticket.ambienteId ?? null,
    codigo,
    nombre: ambiente?.nombre ?? codigo,
    tipo: ambiente?.tipo ?? null,
    piso: ambiente?.piso ?? null,
    capacidad: ambiente?.capacidad ?? null,
    pabellon: pabellon?.nombre ?? null,
    sede: sedesRepository.findById(pabellon?.sedeId)?.nombre ?? null,
    ticketsEnCurso: delAmbiente.filter(esTicketEnCurso).length,
    ultimoCierre: cierres.sort().at(-1) ?? null,
  }
}

// el teléfono sirve para coordinar el acceso al ambiente
function solicitanteDe(ticket) {
  return { ...persona(ticket.usuarioId), telefono: usuariosRepository.findById(ticket.usuarioId).telefono }
}

// subcategoría y descripción vienen del registro (HU-3) y pueden faltar
function resumirTicket(ticket) {
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    descripcion: ticket.descripcion ?? null,
    estado: ticket.estado,
    prioridad: ticket.prioridad,
    creadoEn: ticket.creadoEn,
    cerradoEn: ticket.cerradoEn,
    categoria: referencia(categoriasRepository.findById(ticket.categoriaId)),
    subcategoria: referencia(subcategoriasRepository.findById(ticket.subcategoriaId)),
    ambiente: ambienteDe(ticket),
    solicitante: solicitanteDe(ticket),
    tecnico: persona(ticket.asignadoA),
  }
}

function leerBitacora(ticket, permisos) {
  return bitacoraRepository
    .findAll({ ticketId: ticket.id })
    .filter((entrada) => permisos.verInternas || entrada.tipo === 'publico')
    .sort(porAntiguedad)
    .map(({ id, tipo, mensaje, creadoEn, autorId }) => ({ id, tipo, mensaje, creadoEn, autor: persona(autorId) }))
}

function estadosDe(ticket) {
  return historialRepository.findAll({ ticketId: ticket.id, tipo: 'estado' }).sort(porAntiguedad)
}

function leerEspera(ticket, ahora = Date.now()) {
  if (ticket.estado !== 'en_espera') return null
  const espera = estadosDe(ticket).findLast((evento) => evento.estado === 'en_espera')
  if (!espera) return null
  const { motivo, retornoEstimado, creadoEn } = espera
  return { motivo, retornoEstimado, desde: creadoEn, retornoVencido: Date.parse(retornoEstimado) < ahora }
}

function tiempoEsperadoDe(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  const subcategoria = subcategoriasRepository.findById(ticket.subcategoriaId)
  return (subcategoria ?? categoriasRepository.findById(ticket.categoriaId)).tiempoEsperadoHoras
}

// el plazo se compara con el tiempo de atención, sin contar las esperas
function leerTiempos(ticket) {
  const tiempos = tiemposDe(estadosDe(ticket))
  const esperadoHoras = tiempoEsperadoDe(ticket)
  return { ...tiempos, esperadoHoras, dentroDelPlazo: tiempos.atencionMs <= esperadoHoras * HORA_MS }
}

function leerDesenlace(ticket) {
  if (ticket.estado !== 'cerrado') return null
  const cierre = estadosDe(ticket).findLast((evento) => evento.estado === 'cerrado')
  // si lo cerró otra historia no hay solución que mostrar
  if (!cierre) return null
  return { solucion: cierre.solucion, cerradoEn: cierre.creadoEn, cerradoPor: persona(cierre.autorId) }
}

function leerAtencion(ticket, usuario) {
  const permisos = permisosSobre(ticket, usuario)
  return {
    ticket: resumirTicket(ticket),
    espera: leerEspera(ticket),
    tiempos: leerTiempos(ticket),
    desenlace: leerDesenlace(ticket),
    bitacora: leerBitacora(ticket, permisos),
    eventos: leerEventos(ticket),
    permisos,
  }
}

// Atención de un ticket (HU-5). Quien lo reportó solo ve los comentarios públicos.
export function obtenerAtencion(codigo, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    return leerAtencion(buscarTicket(codigo), usuario)
  })
}

// las notas internas solo las escriben el técnico asignado y el supervisor
export function agregarEntrada(codigo, datos, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    const ticket = buscarTicket(codigo)
    const permisos = permisosSobre(ticket, usuario)
    if (ticket.estado === 'cerrado') {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket está cerrado: su bitácora ya no admite entradas.')
    }
    if (ticket.estado === 'cancelado') {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket está cancelado: su bitácora ya no admite entradas.')
    }
    const esInterna = datos?.tipo === 'interno'
    if (!(esInterna ? permisos.notaInterna : permisos.comentar)) {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        esInterna
          ? 'Solo el técnico asignado y el supervisor registran notas internas.'
          : 'Solo quien reportó el ticket, el técnico asignado y el supervisor comentan en su bitácora.',
      )
    }
    const errores = validateEntrada(datos ?? {})
    if (hasErrors(errores)) throw validationError(errores)

    bitacoraRepository.insert({
      id: nextId('bit', bitacoraRepository.findAll()),
      ticketId: ticket.id,
      autorId: usuario.id,
      tipo: datos.tipo,
      mensaje: normalizeTexto(datos.mensaje),
      creadoEn: new Date().toISOString(),
    })
    return leerAtencion(ticket, usuario)
  })
}

function transicionInvalida(ticket, estado) {
  return new ServiceError(
    409,
    'INVALID_TRANSITION',
    `El ticket está ${formatEstado(ticket.estado).toLowerCase()} y no admite el cambio a «${formatEstado(estado)}».`,
    null,
    { details: { estado: ticket.estado, permitidas: [...transicionesDesde(ticket.estado)] } },
  )
}

// historial y ticket quedan con la misma fecha
function registrarEstado(ticket, estado, usuario, { motivo = null, retornoEstimado = null, solucion = null } = {}) {
  const ahora = new Date().toISOString()
  historialRepository.insert({
    id: nextId('his', historialRepository.findAll()),
    ticketId: ticket.id,
    tipo: 'estado',
    estado,
    asignadoA: null,
    autorId: usuario.id,
    motivo,
    retornoEstimado,
    solucion,
    creadoEn: ahora,
  })
  return estadoDeTicketRepository.guardar(ticket.id, { estado, cerradoEn: estado === 'cerrado' ? ahora : null })
}

// Solo el técnico asignado cambia el estado. La espera pide motivo y fecha de retorno.
export function cambiarEstado(codigo, datos, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    const ticket = buscarTicket(codigo)
    permisosSobre(ticket, usuario)
    if (!esSuTecnico(ticket, usuario)) {
      throw new ServiceError(403, 'FORBIDDEN', 'Solo el técnico que tiene asignado el ticket cambia su estado.')
    }
    const errorDeEstado = validateNuevoEstado(datos?.estado)
    if (errorDeEstado) throw validationError({ estado: errorDeEstado })
    // va antes que el detalle, no tiene sentido pedir motivo si la espera no se permite
    if (!esTransicionValida(ticket.estado, datos.estado)) throw transicionInvalida(ticket, datos.estado)
    const errores = validateCambioEstado(datos)
    if (hasErrors(errores)) throw validationError(errores)

    const detalle =
      datos.estado === 'en_espera'
        ? { motivo: normalizeTexto(datos.motivo), retornoEstimado: finDelDiaEnLima(datos.retornoEstimado) }
        : {}
    return leerAtencion(registrarEstado(ticket, datos.estado, usuario, detalle), usuario)
  })
}

// Cierra con la solución. Desde ahí quien lo reportó ya puede responder la encuesta.
export function cerrarTicket(codigo, datos, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    const ticket = buscarTicket(codigo)
    permisosSobre(ticket, usuario)
    if (!esSuTecnico(ticket, usuario)) {
      throw new ServiceError(403, 'FORBIDDEN', 'Solo el técnico que tiene asignado el ticket lo cierra.')
    }
    if (!sePuedeCerrar(ticket.estado)) {
      throw new ServiceError(
        409,
        'INVALID_TRANSITION',
        `El ticket está ${formatEstado(ticket.estado).toLowerCase()}: solo se cierra un ticket en atención o resuelto.`,
        null,
        { details: { estado: ticket.estado, permitidas: [...transicionesDesde(ticket.estado)] } },
      )
    }
    const errores = validateCierre(datos ?? {})
    if (hasErrors(errores)) throw validationError(errores)

    const cerrado = registrarEstado(ticket, 'cerrado', usuario, { solucion: normalizeTexto(datos.solucion) })
    return leerAtencion(cerrado, usuario)
  })
}

// las asignaciones no tienen duración, solo los cambios de estado
function leerEventos(ticket) {
  const estados = estadosDe(ticket)
  const etapas = etapasDe(estados)
  const etapaDe = new Map(estados.map((evento, indice) => [evento.id, etapas[indice]]))

  return historialRepository
    .findAll({ ticketId: ticket.id })
    .sort(porAntiguedad)
    .map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      estado: evento.estado,
      creadoEn: evento.creadoEn,
      autor: persona(evento.autorId),
      asignadoA: persona(evento.asignadoA),
      motivo: evento.motivo,
      prioridadAnterior: evento.prioridadAnterior ?? null,
      prioridadNueva: evento.prioridadNueva ?? null,
      retornoEstimado: evento.retornoEstimado,
      solucion: evento.solucion,
      duracionMs: etapaDe.get(evento.id)?.ms ?? null,
      enCurso: etapaDe.get(evento.id)?.enCurso ?? false,
    }))
}

// Historial completo del ticket, con el tiempo que pasó en cada estado.
export function obtenerHistorial(codigo, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    const ticket = buscarTicket(codigo)
    permisosSobre(ticket, usuario)
    return {
      ticket: resumirTicket(ticket),
      eventos: leerEventos(ticket),
      etapas: tiempoPorEstado(estadosDe(ticket)),
      tiempos: leerTiempos(ticket),
    }
  })
}

function ultimaActividadDe(ticket) {
  const momentos = [
    ...bitacoraRepository.findAll({ ticketId: ticket.id }),
    ...historialRepository.findAll({ ticketId: ticket.id }),
  ].map(({ creadoEn }) => creadoEn)
  return momentos.sort().at(-1) ?? ticket.creadoEn
}

// tickets que tiene o tuvo el técnico, primero los de actividad más reciente
export function listarAtendidos(usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    if (usuario.rol !== 'tecnico') {
      throw new ServiceError(403, 'FORBIDDEN', 'Solo los técnicos tienen un historial de atención.')
    }
    return ticketsRepository
      .findAll({ asignadoA: usuario.id })
      .map((ticket) => {
        const ambiente = ambientesRepository.findById(ticket.ambienteId)
        return {
          id: ticket.id,
          codigo: ticket.codigo,
          asunto: ticket.asunto,
          estado: ticket.estado,
          prioridad: ticket.prioridad,
          creadoEn: ticket.creadoEn,
          cerradoEn: ticket.cerradoEn,
          actualizadoEn: ultimaActividadDe(ticket),
          dentroDelPlazo: leerTiempos(ticket).dentroDelPlazo,
          categoria: referencia(categoriasRepository.findById(ticket.categoriaId)),
          ambiente: {
            id: ambiente?.id ?? ticket.ambienteId ?? null,
            codigo: ambiente?.codigo ?? ticket.ambienteCodigo ?? 'Sin ambiente',
          },
          solicitante: persona(ticket.usuarioId),
        }
      })
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn) || b.codigo.localeCompare(a.codigo))
  })
}

// datos del ticket para la vista de la encuesta (HU-6)
export async function obtenerTicketPorCodigo(codigoTicket) {
  // antes, sin código, se tomaba el primer ticket cerrado de cualquier cuenta
  if (!codigoTicket) return null
  let ticket
  try {
    ticket = buscarTicket(codigoTicket)
  } catch {
    ticket = ticketsRepository.findAll().find((t) => t.codigo === codigoTicket || t.id === codigoTicket) || null
  }

  if (!ticket) return null

  const categoria = categoriasRepository.findById(ticket.categoriaId)
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  const tecnico = ticket.asignadoA ? usuariosRepository.findById(ticket.asignadoA) : null

  return {
    ...ticket,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    categoriaNombre: categoria?.nombre || 'General',
    ambienteCodigo: ambiente?.codigo || ticket.ambienteCodigo || 'Ambiente',
    tecnicoNombre: tecnico ? `${tecnico.nombres} ${tecnico.apellidos}` : 'No asignado',
    fechaCierre: ticket.cerradoEn ? new Date(ticket.cerradoEn).toLocaleDateString('es-PE') : 'Recientemente',
  }
}
