import { usuariosRepository } from '../repositories/usuarios.repository.js'
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

/**
 * Lo que `usuario` puede hacer con `ticket`. Lo ven el equipo de atención y quien lo reportó; cualquier otra cuenta
 * recibe 403 FORBIDDEN. Devuelve:
 * - `verInternas`: lee las notas internas (solo el equipo).
 * - `comentar`: publica comentarios (quien lo reportó, el técnico que lo tiene asignado y el supervisor).
 * - `notaInterna`: registra notas internas (el técnico que lo tiene asignado y el supervisor).
 * Un ticket cerrado ya no admite entradas.
 */
export function permisosSobre(ticket, usuario) {
  const esEquipo = EQUIPO.includes(usuario.rol)
  const loReporto = ticket.usuarioId === usuario.id
  if (!esEquipo && !loReporto) {
    throw new ServiceError(403, 'FORBIDDEN', 'No tienes permiso para ver este ticket.')
  }
  const admiteEntradas = ticket.estado !== 'cerrado'
  const loAtiende = usuario.rol === 'supervisor' || (usuario.rol === 'tecnico' && ticket.asignadoA === usuario.id)
  return {
    verInternas: esEquipo,
    comentar: admiteEntradas && (loAtiende || loReporto),
    notaInterna: admiteEntradas && loAtiende,
  }
}
