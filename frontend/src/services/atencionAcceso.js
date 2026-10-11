import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { transicionesDesde } from '../utils/estadosTicket.js'
import { ServiceError } from './ServiceError.js'

/** Pasos internos de los servicios de atención (HU-5): quién hace la petición y qué puede hacer con un ticket. */

/** Roles del equipo de atención: ven las notas internas de la bitácora. */
const EQUIPO = Object.freeze(['tecnico', 'supervisor'])

/**
 * La cuenta que hace la petición, como la tomaría el servidor de la sesión: 401 UNAUTHENTICATED si no existe y 403
 * FORBIDDEN si el supervisor la bloqueó.
 */
export function exigirCuentaActiva(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  if (!usuario) {
    throw new ServiceError(401, 'UNAUTHENTICATED', 'Inicia sesión para consultar el ticket.')
  }
  if (usuario.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', 'Tu cuenta está bloqueada y no puede consultar tickets.')
  }
  return usuario
}

/** Si `usuario` es el técnico que tiene asignado el ticket: solo él cambia su estado. */
export function esSuTecnico(ticket, usuario) {
  return usuario.rol === 'tecnico' && ticket.asignadoA === usuario.id
}

/**
 * Lo que `usuario` puede hacer con `ticket`. Lo ven el equipo de atención y quien lo reportó; cualquier otra cuenta
 * recibe 403 FORBIDDEN. Devuelve:
 * - `verInternas`: lee las notas internas (solo el equipo).
 * - `comentar`: publica comentarios (quien lo reportó, el técnico que lo tiene asignado y el supervisor).
 * - `notaInterna`: registra notas internas (el técnico que lo tiene asignado y el supervisor).
 * - `transiciones`: estados a los que puede pasar el ticket (solo el técnico que lo tiene asignado).
 * Un ticket cerrado ya no admite entradas ni cambios de estado.
 */
export function permisosSobre(ticket, usuario) {
  const esEquipo = EQUIPO.includes(usuario.rol)
  const loReporto = ticket.usuarioId === usuario.id
  if (!esEquipo && !loReporto) {
    throw new ServiceError(403, 'FORBIDDEN', 'No tienes permiso para ver este ticket.')
  }
  const admiteEntradas = ticket.estado !== 'cerrado'
  const loAtiende = usuario.rol === 'supervisor' || esSuTecnico(ticket, usuario)
  return {
    verInternas: esEquipo,
    comentar: admiteEntradas && (loAtiende || loReporto),
    notaInterna: admiteEntradas && loAtiende,
    transiciones: esSuTecnico(ticket, usuario) ? [...transicionesDesde(ticket.estado)] : [],
  }
}
