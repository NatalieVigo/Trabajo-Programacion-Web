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

/** De la más antigua a la más reciente; si coinciden en el momento, en el orden en que se registraron. */
const porAntiguedad = (a, b) => a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id)

/** Lo que se muestra de una cuenta junto a un ticket: nunca su correo ni su contraseña. */
function persona(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  return usuario && { id: usuario.id, nombres: usuario.nombres, apellidos: usuario.apellidos, rol: usuario.rol }
}

/** El ticket (HU-3) con ese código, sin distinguir mayúsculas. Si no existe, 404 TICKET_NOT_FOUND. */
function buscarTicket(codigo) {
  const buscado = String(codigo ?? '').trim().toUpperCase()
  const ticket = ticketsRepository.findOne({ codigo: buscado })
  if (!ticket) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket con ese código.')
  }
  return ticket
}

/** Solo el id y el nombre de una fila del catálogo (HU-2), o null si no existe. */
const referencia = (fila) => (fila ? { id: fila.id, nombre: fila.nombre } : null)

/**
 * El ambiente del ticket con su ubicación (catálogo de HU-2) y lo que pasa en él: cuántos tickets siguen en curso
 * allí y cuándo se cerró el último.
 */
function ambienteDe(ticket) {
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  const pabellon = pabellonesRepository.findById(ambiente.pabellonId)
  const delAmbiente = ticketsRepository.findAll({ ambienteId: ambiente.id })
  const cierres = delAmbiente.map(({ cerradoEn }) => cerradoEn).filter(Boolean)
  return {
    id: ambiente.id,
    codigo: ambiente.codigo,
    nombre: ambiente.nombre,
    tipo: ambiente.tipo,
    piso: ambiente.piso,
    capacidad: ambiente.capacidad,
    pabellon: pabellon?.nombre ?? null,
    sede: sedesRepository.findById(pabellon?.sedeId)?.nombre ?? null,
    ticketsEnCurso: delAmbiente.filter(esTicketEnCurso).length,
    ultimoCierre: cierres.sort().at(-1) ?? null,
  }
}

/** Quien reportó el ticket, con el teléfono para coordinar el acceso al ambiente. */
function solicitanteDe(ticket) {
  return { ...persona(ticket.usuarioId), telefono: usuariosRepository.findById(ticket.usuarioId).telefono }
}

/**
 * Datos del reporte con los nombres de su categoría, su ambiente y las personas. Solo lee lo de otras historias: la
 * subcategoría y la descripción son del registro de HU-3 y quedan en null mientras el ticket no las tenga.
 */
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

/** Entradas de la bitácora que `permisos` deja leer, con su autor, de la más antigua a la más reciente. */
function leerBitacora(ticket, permisos) {
  return bitacoraRepository
    .findAll({ ticketId: ticket.id })
    .filter((entrada) => permisos.verInternas || entrada.tipo === 'publico')
    .sort(porAntiguedad)
    .map(({ id, tipo, mensaje, creadoEn, autorId }) => ({ id, tipo, mensaje, creadoEn, autor: persona(autorId) }))
}

/** Cambios de estado del ticket que quedaron en el historial, del más antiguo al más reciente. */
function estadosDe(ticket) {
  return historialRepository.findAll({ ticketId: ticket.id, tipo: 'estado' }).sort(porAntiguedad)
}

/**
 * La espera en curso de un ticket en espera: { motivo, retornoEstimado, desde, retornoVencido }, donde
 * `retornoVencido` indica que la fecha estimada de retorno ya pasó. Para cualquier otro estado, null.
 */
function leerEspera(ticket, ahora = Date.now()) {
  if (ticket.estado !== 'en_espera') return null
  const espera = estadosDe(ticket).findLast((evento) => evento.estado === 'en_espera')
  if (!espera) return null
  const { motivo, retornoEstimado, creadoEn } = espera
  return { motivo, retornoEstimado, desde: creadoEn, retornoVencido: Date.parse(retornoEstimado) < ahora }
}

/**
 * Horas de atención esperadas para el ticket: las de su subcategoría, si HU-3 la registró en `subcategoriaId`, o las
 * de su categoría (catálogo de HU-2).
 */
function tiempoEsperadoDe(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  const subcategoria = subcategoriasRepository.findById(ticket.subcategoriaId)
  return (subcategoria ?? categoriasRepository.findById(ticket.categoriaId)).tiempoEsperadoHoras
}

/**
 * Tiempos de la atención hasta el cierre, o hasta ahora si sigue en curso: { totalMs, enEsperaMs, atencionMs,
 * esperadoHoras, dentroDelPlazo }. El plazo se compara con el tiempo de atención, que no cuenta las esperas.
 */
function leerTiempos(ticket) {
  const tiempos = tiemposDe(estadosDe(ticket))
  const esperadoHoras = tiempoEsperadoDe(ticket)
  return { ...tiempos, esperadoHoras, dentroDelPlazo: tiempos.atencionMs <= esperadoHoras * HORA_MS }
}

/** Cómo terminó un ticket que cerró su técnico: { solucion, cerradoEn, cerradoPor }. Si no, null. */
function leerDesenlace(ticket) {
  if (ticket.estado !== 'cerrado') return null
  const cierre = estadosDe(ticket).findLast((evento) => evento.estado === 'cerrado')
  // Sin cierre en el historial no hay desenlace que mostrar: lo cerró otra historia, sin solución.
  if (!cierre) return null
  return { solucion: cierre.solucion, cerradoEn: cierre.creadoEn, cerradoPor: persona(cierre.autorId) }
}

/** La atención del ticket tal como la ve `usuario`: 403 FORBIDDEN si no es del equipo ni quien lo reportó. */
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

/**
 * Vista consolidada de la atención de un ticket (HU-5 · 5.1 y 5.6, p25): { ticket, espera, tiempos, desenlace,
 * bitacora: [{ id, tipo, mensaje, creadoEn, autor }], eventos, permisos: { verInternas, comentar, notaInterna,
 * transiciones, cerrar } }.
 * - `ticket`: los datos del reporte, con su ambiente y quien lo reportó.
 * - `espera`: { motivo, retornoEstimado, desde, retornoVencido } mientras el ticket está en espera; si no, null.
 * - `tiempos`: { totalMs, enEsperaMs, atencionMs, esperadoHoras, dentroDelPlazo }, hasta el cierre o hasta ahora.
 * - `desenlace`: { solucion, cerradoEn, cerradoPor } de un ticket cerrado; si no, null.
 * - `eventos`: el historial del ticket, como en obtenerHistorial.
 * El equipo de atención lee toda la bitácora; quien reportó el ticket solo recibe los comentarios públicos. Falla con
 * 401, 403 FORBIDDEN o 404 TICKET_NOT_FOUND.
 */
export function obtenerAtencion(codigo, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    return leerAtencion(buscarTicket(codigo), usuario)
  })
}

/**
 * Agrega una entrada a la bitácora: `datos` es { tipo: 'publico' | 'interno', mensaje }. Comenta quien reportó el
 * ticket, el técnico que lo tiene asignado o el supervisor; las notas internas son solo de estos dos últimos. Falla
 * con 409 TICKET_CLOSED si el ticket ya se cerró, 403 FORBIDDEN o 400 VALIDATION_ERROR. Devuelve la atención
 * actualizada.
 */
export function agregarEntrada(codigo, datos, usuarioId) {
  return simulateRequest(() => {
    const usuario = exigirCuentaActiva(usuarioId)
    const ticket = buscarTicket(codigo)
    const permisos = permisosSobre(ticket, usuario)
    if (ticket.estado === 'cerrado') {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket está cerrado: su bitácora ya no admite entradas.')
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

/** 409 del cambio de estado que el estado actual del ticket no admite; `details` trae los que sí admite. */
function transicionInvalida(ticket, estado) {
  return new ServiceError(
    409,
    'INVALID_TRANSITION',
    `El ticket está ${formatEstado(ticket.estado).toLowerCase()} y no admite el cambio a «${formatEstado(estado)}».`,
    null,
    { details: { estado: ticket.estado, permitidas: [...transicionesDesde(ticket.estado)] } },
  )
}

/**
 * Deja el nuevo estado en el historial, con su autor, su momento y lo propio de ese estado (el motivo y la fecha
 * estimada de retorno de una espera, o la solución de un cierre), y en el ticket, que al cerrarse toma esa misma fecha
 * de cierre. Devuelve el ticket actualizado.
 */
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

/**
 * Cambia el estado del ticket (HU-5 · 5.2 y 5.3, p26): `datos` es { estado } y, para dejarlo en espera, además
 * { motivo, retornoEstimado } con la fecha estimada de retorno como «2026-10-05» (de hoy en adelante). Solo lo hace el
 * técnico que lo tiene asignado y solo a un estado que el actual admita (utils/estadosTicket.js). Falla con 403
 * FORBIDDEN, 400 VALIDATION_ERROR o 409 INVALID_TRANSITION, con details: { estado, permitidas }. El cambio queda en el
 * historial y se devuelve la atención actualizada.
 */
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
    // Antes que el detalle del cambio: no tiene sentido pedir el motivo de una espera que el ticket no admite.
    if (!esTransicionValida(ticket.estado, datos.estado)) throw transicionInvalida(ticket, datos.estado)
    const errores = validateCambioEstado(datos)
    if (hasErrors(errores)) throw validationError(errores)

    // El motivo y la fecha de retorno solo se guardan con la espera: en otro estado se ignoran.
    const detalle =
      datos.estado === 'en_espera'
        ? { motivo: normalizeTexto(datos.motivo), retornoEstimado: finDelDiaEnLima(datos.retornoEstimado) }
        : {}
    return leerAtencion(registrarEstado(ticket, datos.estado, usuario, detalle), usuario)
  })
}

/**
 * Cierra el ticket (HU-5 · 5.4, p26): `datos` es { solucion }, la descripción de la solución aplicada. Solo lo hace
 * el técnico que lo tiene asignado, con el ticket en atención o resuelto. Falla con 403 FORBIDDEN, 409
 * INVALID_TRANSITION o 400 VALIDATION_ERROR. El ticket queda cerrado con su fecha de cierre y la respuesta trae su
 * desenlace y el tiempo total de atención; desde entonces quien lo reportó puede responder la encuesta (HU-6).
 */
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

/**
 * Eventos del historial con las personas que nombran y, en cada cambio de estado, cuánto estuvo el ticket en ese
 * estado (`duracionMs`) y si es el actual (`enCurso`). Las asignaciones (HU-4) no tienen duración.
 */
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

/**
 * Historial completo de un ticket (HU-5 · 5.5, p27): { ticket, eventos, etapas, tiempos }.
 * - `eventos`: cada cambio de estado y cada asignación, del más antiguo al más reciente: { id, tipo, estado, creadoEn,
 *   autor, asignadoA, motivo, retornoEstimado, solucion, duracionMs, enCurso }.
 * - `etapas`: el tiempo total en cada estado, [{ estado, ms }].
 * - `tiempos`: los mismos de obtenerAtencion.
 * Lo consultan el equipo de atención y quien reportó el ticket. Falla con 401, 403 FORBIDDEN o 404 TICKET_NOT_FOUND.
 */
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

/** Momento de la última entrada de bitácora o del último evento del historial del ticket. */
function ultimaActividadDe(ticket) {
  const momentos = [
    ...bitacoraRepository.findAll({ ticketId: ticket.id }),
    ...historialRepository.findAll({ ticketId: ticket.id }),
  ].map(({ creadoEn }) => creadoEn)
  return momentos.sort().at(-1) ?? ticket.creadoEn
}

/**
 * Historial de atención de un técnico (HU-5 · 5.6): los tickets que tiene o tuvo a su cargo, del de actividad más
 * reciente al más antiguo: [{ id, codigo, asunto, estado, prioridad, creadoEn, cerradoEn, actualizadoEn,
 * dentroDelPlazo, categoria, ambiente: { id, codigo }, solicitante }]. `dentroDelPlazo` indica si la atención no superó
 * el tiempo esperado. Falla con 401 o con 403 FORBIDDEN si la cuenta no es de un técnico.
 */
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
          ambiente: { id: ambiente.id, codigo: ambiente.codigo },
          solicitante: persona(ticket.usuarioId),
        }
      })
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn) || b.codigo.localeCompare(a.codigo))
  })
}

/**
 * Obtiene la información enriquecida de un ticket para la vista de encuesta (HU-6).
 */
export async function obtenerTicketPorCodigo(codigoTicket) {
  let ticket
  if (codigoTicket) {
    try {
      ticket = buscarTicket(codigoTicket)
    } catch {
      ticket = ticketsRepository.findAll().find((t) => t.codigo === codigoTicket || t.id === codigoTicket) || null
    }
  } else {
    ticket = ticketsRepository.findAll().find((t) => t.estado === 'cerrado') || ticketsRepository.findAll()[0] || null
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
    ambienteCodigo: ambiente?.codigo || 'Ambiente',
    tecnicoNombre: tecnico ? `${tecnico.nombres} ${tecnico.apellidos}` : 'No asignado',
    fechaCierre: ticket.cerradoEn ? new Date(ticket.cerradoEn).toLocaleDateString('es-PE') : 'Recientemente',
  }
}
