import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { sePuedeCerrar, transicionesDesde } from '../utils/estadosTicket.js'
import { ServiceError } from './ServiceError.js'

// Helpers de atención (HU-5): quién pide y qué puede hacer con el ticket.

// estos roles ven las notas internas
const EQUIPO = Object.freeze(['tecnico', 'supervisor'])

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

// solo el técnico asignado cambia el estado y lo cierra
export function esSuTecnico(ticket, usuario) {
  return usuario.rol === 'tecnico' && ticket.asignadoA === usuario.id
}

// Qué puede hacer el usuario con el ticket; cerrado o cancelado ya no admite cambios.
export function permisosSobre(ticket, usuario) {
  const esEquipo = EQUIPO.includes(usuario.rol)
  const loReporto = ticket.usuarioId === usuario.id
  if (!esEquipo && !loReporto) {
    throw new ServiceError(403, 'FORBIDDEN', 'No tienes permiso para ver este ticket.')
  }
  const admiteEntradas = !['cerrado', 'cancelado'].includes(ticket.estado)
  const loGestiona = esSuTecnico(ticket, usuario)
  const loAtiende = usuario.rol === 'supervisor' || loGestiona
  return {
    verInternas: esEquipo,
    comentar: admiteEntradas && (loAtiende || loReporto),
    notaInterna: admiteEntradas && loAtiende,
    transiciones: loGestiona ? [...transicionesDesde(ticket.estado)] : [],
    cerrar: loGestiona && sePuedeCerrar(ticket.estado),
  }
}
