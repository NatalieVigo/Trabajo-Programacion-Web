import { bitacoraRepository } from '../repositories/atencion.repository.js'
import { ambientesRepository, categoriasRepository } from '../repositories/catalogo.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { normalizeTexto, validateEntrada } from '../utils/atencionValidators.js'
import { nextId } from '../utils/ids.js'
import { hasErrors } from '../utils/validators.js'
import { exigirCuentaActiva, permisosSobre } from './atencionAcceso.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

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

/** Datos del ticket con los nombres de su categoría, su ambiente y las personas. Solo lee lo de otras historias. */
function resumirTicket(ticket) {
  const categoria = categoriasRepository.findById(ticket.categoriaId)
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    estado: ticket.estado,
    prioridad: ticket.prioridad,
    creadoEn: ticket.creadoEn,
    cerradoEn: ticket.cerradoEn,
    categoria: { id: categoria.id, nombre: categoria.nombre },
    ambiente: { id: ambiente.id, codigo: ambiente.codigo, nombre: ambiente.nombre },
    solicitante: persona(ticket.usuarioId),
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

/** La atención del ticket tal como la ve `usuario`: 403 FORBIDDEN si no es del equipo ni quien lo reportó. */
function leerAtencion(ticket, usuario) {
  const permisos = permisosSobre(ticket, usuario)
  return { ticket: resumirTicket(ticket), bitacora: leerBitacora(ticket, permisos), permisos }
}

/**
 * Atención de un ticket (HU-5 · 5.1, p25): { ticket, bitacora: [{ id, tipo, mensaje, creadoEn, autor }], permisos:
 * { verInternas, comentar, notaInterna } }. El equipo de atención lee toda la bitácora; quien reportó el ticket solo
 * recibe los comentarios públicos. Falla con 401, 403 FORBIDDEN o 404 TICKET_NOT_FOUND.
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
