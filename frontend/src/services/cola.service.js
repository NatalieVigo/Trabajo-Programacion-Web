import { categoriasRepository, ambientesRepository, habilitacionesRepository, subcategoriasRepository } from '../repositories/catalogo.repository.js'
import { updateTables } from '../repositories/db.js'
import { historialRepository } from '../repositories/atencion.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { HORA_MS } from '../utils/duracion.js'
import { nextId } from '../utils/ids.js'
import { getDisplayName } from '../utils/format.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { tiemposDe } from './tiemposDeAtencion.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { exigirSupervisorActivo } from './supervisorActivo.js'

export const HORAS_POR_PRIORIDAD = Object.freeze({ critica: 2, alta: 8, media: 24, baja: 72 })
const ESTADOS_COLA = new Set(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

function cuentaActiva(usuarioId, rol) {
  const cuenta = usuariosRepository.findById(usuarioId)
  if (cuenta?.rol !== rol || cuenta.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', `Solo un ${rol === 'tecnico' ? 'técnico' : 'supervisor'} activo puede consultar esta vista.`)
  }
  return cuenta
}

const nombre = (persona) => persona ? getDisplayName(persona) : null

function horasEsperadas(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  const categoria = subcategoriasRepository.findById(ticket.subcategoriaId) ?? categoriasRepository.findById(ticket.categoriaId)
  return categoria?.tiempoEsperadoHoras ?? HORAS_POR_PRIORIDAD[ticket.prioridad]
}

function detalle(ticket, ahora) {
  const estados = historialRepository.findAll({ ticketId: ticket.id, tipo: 'estado' }).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const { atencionMs } = tiemposDe(estados, ahora)
  const esperadoHoras = horasEsperadas(ticket)
  const restanteMs = esperadoHoras * HORA_MS - atencionMs
  const espera = ticket.estado === 'en_espera' ? estados.findLast(({ estado }) => estado === 'en_espera') : null
  const categoria = categoriasRepository.findById(ticket.categoriaId)
  const subcategoria = subcategoriasRepository.findById(ticket.subcategoriaId)
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    categoriaId: ticket.categoriaId,
    categoria: categoria?.nombre ?? 'Sin categoría',
    subcategoria: subcategoria?.nombre ?? null,
    ambienteId: ticket.ambienteId,
    ambiente: ambiente?.codigo ?? ambiente?.nombre ?? ticket.ambienteCodigo ?? 'Sin ambiente',
    solicitante: nombre(usuariosRepository.findById(ticket.usuarioId)),
    tecnicoId: ticket.asignadoA,
    tecnico: nombre(usuariosRepository.findById(ticket.asignadoA)),
    prioridad: ticket.prioridad,
    estado: ticket.estado,
    creadoEn: ticket.creadoEn,
    cerradoEn: ticket.cerradoEn,
    resueltoEn: estados.findLast(({ estado }) => estado === 'resuelto')?.creadoEn ?? null,
    antiguedadMs: Math.max(0, ahora - Date.parse(ticket.creadoEn)),
    esperadoHoras,
    restanteMs,
    vencimientoEn: new Date(ahora + restanteMs).toISOString(),
    fueraDePlazo: esTicketEnCurso(ticket) && ticket.estado !== 'en_espera' && restanteMs < 0,
    espera: espera ? { motivo: espera.motivo, retornoEstimado: espera.retornoEstimado } : null,
  }
}

function tecnicosConCarga() {
  const tickets = ticketsRepository.findAll()
  return usuariosRepository.findAll({ rol: 'tecnico', estado: 'activo' }).map((tecnico) => {
    const propios = tickets.filter(({ asignadoA }) => asignadoA === tecnico.id)
    return {
      id: tecnico.id,
      nombre: nombre(tecnico),
      habilitadas: habilitacionesRepository.findAll({ tecnicoId: tecnico.id }).map(({ categoriaId }) => categoriaId),
      carga: propios.length,
      criticos: propios.filter(({ prioridad }) => prioridad === 'critica').length,
    }
  })
}

export function listarCola(usuarioId) {
  return simulateRequest(() => {
    cuentaActiva(usuarioId, 'supervisor')
    const ahora = Date.now()
    return {
      tickets: ticketsRepository.findAll((ticket) => ESTADOS_COLA.has(ticket.estado)).map((ticket) => detalle(ticket, ahora)),
      tecnicos: tecnicosConCarga(),
      categorias: categoriasRepository.findAll().map(({ id, nombre }) => ({ id, nombre })),
      ambientes: ambientesRepository.findAll().map(({ id, codigo, nombre }) => ({ id, nombre: codigo ?? nombre })),
    }
  })
}

export function listarBandeja(usuarioId) {
  return simulateRequest(() => {
    const tecnico = cuentaActiva(usuarioId, 'tecnico')
    const ahora = Date.now()
    return {
      tecnico: { nombre: nombre(tecnico), especialidades: (tecnico.especialidades ?? []).map((id) => categoriasRepository.findById(id)?.nombre).filter(Boolean) },
      tickets: ticketsRepository.findAll({ asignadoA: tecnico.id }).map((ticket) => detalle(ticket, ahora)),
    }
  })
}

function idsValidos(ids) {
  if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length) {
    throw validationError({ tickets: 'Selecciona al menos un ticket, sin repetirlo.' })
  }
  return ids
}

function ticketsDe(db, ids) {
  return idsValidos(ids).map((id) => {
    const ticket = db.tickets.find((fila) => fila.id === id)
    if (!ticket) throw new ServiceError(404, 'TICKET_NOT_FOUND', 'Uno de los tickets ya no existe.')
    if (!ESTADOS_COLA.has(ticket.estado)) throw new ServiceError(409, 'TICKET_NOT_IN_QUEUE', 'Un ticket seleccionado ya no está en la cola.')
    return ticket
  })
}

function evento(db, ticket, tipo, supervisorId, datos = {}) {
  db.historial.push({
    id: nextId('his', db.historial), ticketId: ticket.id, tipo, estado: null,
    asignadoA: null, autorId: supervisorId, motivo: null, retornoEstimado: null,
    solucion: null, creadoEn: new Date().toISOString(), ...datos,
  })
}

function avisarCambio() {
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
}

export function asignarTickets(ids, tecnicoId, nota, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    if (typeof nota !== 'string' || nota.trim().length > 240) throw validationError({ nota: 'La nota debe tener como máximo 240 caracteres.' })
    const resultado = updateTables(['tickets', 'historial', 'bitacora'], (db) => {
      const seleccion = ticketsDe(db, ids)
      const tecnico = db.usuarios.find(({ id }) => id === tecnicoId)
      if (tecnico?.rol !== 'tecnico' || tecnico.estado !== 'activo') throw validationError({ tecnico: 'Elige un técnico activo.' })
      const habilitadas = new Set(db.habilitaciones.filter(({ tecnicoId: id }) => id === tecnicoId).map(({ categoriaId }) => categoriaId))
      if (seleccion.some(({ categoriaId }) => !habilitadas.has(categoriaId))) {
        throw validationError({ tecnico: 'El técnico no está habilitado para todas las categorías seleccionadas.' })
      }
      if (seleccion.some(({ asignadoA }) => asignadoA === tecnicoId)) {
        throw new ServiceError(409, 'ALREADY_ASSIGNED', 'Uno de los tickets ya está asignado a este técnico.')
      }
      for (const ticket of seleccion) {
        ticket.asignadoA = tecnicoId
        evento(db, ticket, 'asignacion', supervisorId, { asignadoA: tecnicoId })
        if (nota.trim()) db.bitacora.push({
          id: nextId('bit', db.bitacora), ticketId: ticket.id, autorId: supervisorId,
          tipo: 'interno', mensaje: nota.trim(), creadoEn: new Date().toISOString(),
        })
      }
      return seleccion.length
    })
    avisarCambio()
    return resultado
  })
}

export function cambiarPrioridadTickets(ids, prioridad, motivo, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    if (!Object.hasOwn(HORAS_POR_PRIORIDAD, prioridad)) throw validationError({ prioridad: 'Elige una prioridad válida.' })
    if (typeof motivo !== 'string' || motivo.trim().length < 10 || motivo.trim().length > 240) {
      throw validationError({ motivo: 'Explica el motivo con entre 10 y 240 caracteres.' })
    }
    const resultado = updateTables(['tickets', 'historial'], (db) => {
      const seleccion = ticketsDe(db, ids)
      if (seleccion.every(({ prioridad: actual }) => actual === prioridad)) {
        throw validationError({ prioridad: 'La nueva prioridad debe ser diferente de la actual.' })
      }
      let actualizados = 0
      for (const ticket of seleccion) {
        if (ticket.prioridad === prioridad) continue
        actualizados += 1
        const anterior = ticket.prioridad
        ticket.prioridad = prioridad
        ticket.tiempoEsperadoHoras = HORAS_POR_PRIORIDAD[prioridad]
        evento(db, ticket, 'prioridad', supervisorId, {
          prioridadAnterior: anterior, prioridadNueva: prioridad, motivo: motivo.trim(),
        })
      }
      return actualizados
    })
    avisarCambio()
    return resultado
  })
}

export function devolverTickets(ids, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const resultado = updateTables(['tickets', 'historial'], (db) => {
      const seleccion = ticketsDe(db, ids)
      if (seleccion.some(({ asignadoA }) => !asignadoA)) {
        throw new ServiceError(409, 'TICKET_UNASSIGNED', 'Selecciona solo tickets que tengan un técnico asignado.')
      }
      for (const ticket of seleccion) {
        ticket.asignadoA = null
        ticket.estado = 'abierto'
        ticket.cerradoEn = null
        evento(db, ticket, 'asignacion', supervisorId)
        evento(db, ticket, 'estado', supervisorId, { estado: 'abierto' })
      }
      return seleccion.length
    })
    avisarCambio()
    return resultado
  })
}
