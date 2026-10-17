import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { ServiceError } from './ServiceError.js'

/**
 * Solo un supervisor activo puede hacer la operación: si no, 403 FORBIDDEN. Lo usan los servicios del catálogo (HU-2)
 * y de la cola (HU-4), como lo haría el servidor con la sesión de la petición. Devuelve la cuenta.
 */
export function exigirSupervisorActivo(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  if (usuario?.rol !== 'supervisor' || usuario.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor activo puede realizar esta acción.')
  }
  return usuario
}
