import {
  ambientesRepository,
  categoriasRepository,
  subcategoriasRepository,
} from '../repositories/catalogo.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { updateTables } from '../repositories/db.js'
import { nextId } from '../utils/ids.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

const TEXTO_REQUERIDO = 'Completa este campo.'
const AMBIENTE_REQUERIDO = 'Elige el aula o ambiente de la lista.'
export const DIAS_PLAZO_REAPERTURA = 7
export const PLAZO_REAPERTURA_MS = DIAS_PLAZO_REAPERTURA * 24 * 60 * 60 * 1000
const ESTADOS_CANCELABLES = new Set(['abierto', 'reabierto'])

function avisarCambio() {
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
}

function validarNuevoTicket(datos) {
  const errores = {
    categoriaId: datos.categoriaId ? null : TEXTO_REQUERIDO,
    subcategoriaId: datos.subcategoriaId ? null : TEXTO_REQUERIDO,
    ambienteId: datos.ambienteId ? null : AMBIENTE_REQUERIDO,
    asunto: datos.asunto ? null : TEXTO_REQUERIDO,
    descripcion: datos.descripcion ? null : TEXTO_REQUERIDO,
  }

  if (datos.asunto.length > 120) errores.asunto = 'Usa como máximo 120 caracteres.'
  if (datos.descripcion.length > 600) errores.descripcion = 'Usa como máximo 600 caracteres.'

  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje))
}

function normalizarAmbiente(valor) {
  return String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

// busca por id o, si se escribió a mano, por código o nombre
function buscarAmbienteCatalogo(valor) {
  if (!valor) return null
  const buscado = normalizarAmbiente(valor)
  return (
    ambientesRepository.findAll().find(
      (ambiente) =>
        ambiente.id === valor ||
        normalizarAmbiente(ambiente.codigo) === buscado ||
        normalizarAmbiente(ambiente.nombre) === buscado,
    ) ?? null
  )
}

// los tickets antiguos no tienen ambienteId, solo el código escrito
function esDelAmbiente(ticket, ambiente) {
  if (ticket.ambienteId) return ticket.ambienteId === ambiente.id
  return normalizarAmbiente(ticket.ambienteCodigo) === normalizarAmbiente(ambiente.codigo)
}

function exigirUsuarioActivo(usuarioId) {
  if (!usuarioId) throw new ServiceError(401, 'UNAUTHENTICATED', 'Inicia sesión para registrar un ticket.')

  const usuario = usuariosRepository.findById(usuarioId)
  if (!usuario || usuario.estado !== 'activo' || usuario.rol !== 'usuario') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo una cuenta de usuario activa puede registrar tickets.')
  }

  return usuario
}

// mismo ambiente y misma categoría, todavía en curso
function encontrarDuplicado({ ambienteId, ambienteCodigo, categoriaId }) {
  const ambiente = buscarAmbienteCatalogo(ambienteId || ambienteCodigo)
  if (!ambiente || !categoriaId) return null
  return ticketsRepository.findOne(
    (ticket) => ticket.categoriaId === categoriaId && esTicketEnCurso(ticket) && esDelAmbiente(ticket, ambiente),
  )
}

function exigirTicketPropio(ticketId, usuarioId) {
  const usuario = exigirUsuarioActivo(usuarioId)
  const ticket = ticketsRepository.findOne((fila) => fila.id === ticketId || fila.codigo === ticketId)
  if (!ticket || ticket.usuarioId !== usuario.id) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket de tu cuenta con ese código.')
  }
  return { ticket, usuario }
}

function actualizarEstadoConHistorial(ticket, usuario, estado, motivo) {
  return updateTables(['tickets', 'historial'], (db) => {
    const index = db.tickets.findIndex((fila) => fila.id === ticket.id)
    if (index === -1) throw new ServiceError(404, 'TICKET_NOT_FOUND', 'El ticket ya no existe.')

    const actual = db.tickets[index]
    const actualizado = {
      ...actual,
      estado,
      cerradoEn: null,
    }
    db.tickets[index] = actualizado
    db.historial.push({
      id: nextId('his', db.historial),
      ticketId: ticket.id,
      tipo: 'estado',
      estado,
      asignadoA: null,
      autorId: usuario.id,
      motivo,
      retornoEstimado: null,
      solucion: null,
      creadoEn: new Date().toISOString(),
    })
    return actualizado
  })
}

export function estaDentroDelPlazoDeReapertura(ticket, ahora = Date.now()) {
  const cerradoEn = Date.parse(ticket?.cerradoEn ?? '')
  return (
    ticket?.estado === 'cerrado' &&
    Number.isFinite(cerradoEn) &&
    cerradoEn <= ahora &&
    ahora - cerradoEn <= PLAZO_REAPERTURA_MS
  )
}

// solo dice si existe, sin revelar datos del ticket de otra persona
export function existeTicketEnCurso({ ambienteId, ambienteCodigo, categoriaId }) {
  return simulateRequest(() => Boolean(encontrarDuplicado({ ambienteId, ambienteCodigo, categoriaId })))
}

// Registra el ticket (HU-3). Un posible duplicado se avisa, pero no impide enviarlo.
export function crearTicket(datos, usuarioId) {
  return simulateRequest(() => {
    const valores = {
      categoriaId: String(datos?.categoriaId ?? '').trim(),
      subcategoriaId: String(datos?.subcategoriaId ?? '').trim(),
      ambienteId: String(datos?.ambienteId || datos?.ambienteCodigo || '').trim(),
      asunto: String(datos?.asunto ?? '').trim(),
      descripcion: String(datos?.descripcion ?? '').trim(),
    }
    const errores = validarNuevoTicket(valores)
    if (Object.keys(errores).length > 0) throw validationError(errores)

    exigirUsuarioActivo(usuarioId)

    const categoria = categoriasRepository.findById(valores.categoriaId)
    if (!categoria?.activa) {
      throw validationError({ categoriaId: 'Elige una categoría disponible.' })
    }

    const subcategoria = subcategoriasRepository.findById(valores.subcategoriaId)
    if (!subcategoria?.activa || subcategoria.categoriaId !== categoria.id) {
      throw validationError({ subcategoriaId: 'Elige una subcategoría disponible para esta categoría.' })
    }

    const ambiente = buscarAmbienteCatalogo(valores.ambienteId)
    if (!ambiente) throw validationError({ ambienteId: AMBIENTE_REQUERIDO })

    const creado = updateTables(['tickets', 'historial'], (db) => {
      const id = nextId('tck', db.tickets, 5)
      const ahora = new Date()
      const ticket = {
        id,
        codigo: `TCK-${ahora.getFullYear()}-${id.slice('tck-'.length)}`,
        usuarioId,
        categoriaId: categoria.id,
        subcategoriaId: subcategoria.id,
        ambienteId: ambiente.id,
        asunto: valores.asunto,
        descripcion: valores.descripcion,
        prioridad: subcategoria.prioridadPorDefecto ?? categoria.prioridadPorDefecto,
        tiempoEsperadoHoras: subcategoria.tiempoEsperadoHoras ?? categoria.tiempoEsperadoHoras,
        estado: 'abierto',
        creadoEn: ahora.toISOString(),
        cerradoEn: null,
        asignadoA: null,
      }
      db.tickets.push(ticket)
      // el historial empieza con el registro, igual que en el seed
      db.historial.push({
        id: nextId('his', db.historial),
        ticketId: id,
        tipo: 'estado',
        estado: 'abierto',
        asignadoA: null,
        autorId: usuarioId,
        motivo: null,
        retornoEstimado: null,
        solucion: null,
        creadoEn: ticket.creadoEn,
      })
      return ticket
    })
    avisarCambio()
    return creado
  })
}

// la pantalla pide confirmación antes de llamar a esto
export function cancelarTicket(ticketId, usuarioId) {
  return simulateRequest(() => {
    const { ticket, usuario } = exigirTicketPropio(ticketId, usuarioId)
    if (ticket.asignadoA || !ESTADOS_CANCELABLES.has(ticket.estado)) {
      throw new ServiceError(
        409,
        'TICKET_NOT_CANCELLABLE',
        'Solo puedes cancelar un ticket que todavía no fue asignado.',
      )
    }

    const cancelado = actualizarEstadoConHistorial(
      ticket,
      usuario,
      'cancelado',
      'Cancelado por quien reportó el ticket.',
    )
    avisarCambio()
    return cancelado
  })
}

export function reabrirTicket(ticketId, motivo, usuarioId) {
  return simulateRequest(() => {
    const { ticket, usuario } = exigirTicketPropio(ticketId, usuarioId)
    const texto = typeof motivo === 'string' ? motivo.trim() : ''
    if (!texto) throw validationError({ motivo: 'Indica por qué necesitas reabrir el ticket.' })
    if (texto.length > 600) throw validationError({ motivo: 'Usa como máximo 600 caracteres.' })
    if (ticket.estado !== 'cerrado') {
      throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes reabrir un ticket que está cerrado.')
    }
    if (!estaDentroDelPlazoDeReapertura(ticket)) {
      throw new ServiceError(
        409,
        'REOPEN_PERIOD_EXPIRED',
        `El plazo de reapertura de ${DIAS_PLAZO_REAPERTURA} días ya venció.`,
      )
    }

    const reabierto = actualizarEstadoConHistorial(ticket, usuario, 'reabierto', texto)
    avisarCambio()
    return reabierto
  })
}
