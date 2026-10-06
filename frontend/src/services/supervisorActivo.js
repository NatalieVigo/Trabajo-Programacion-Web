import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { ServiceError } from './ServiceError.js'

/**
 * Solo un supervisor activo modifica el catálogo de servicios (HU-2): si no, 403 FORBIDDEN. Paso interno de los
 * servicios del catálogo, como lo haría el servidor con la sesión de la petición. Devuelve la cuenta.
 */
export function exigirSupervisorActivo(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  if (usuario?.rol !== 'supervisor' || usuario.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor puede modificar el catálogo de servicios.')
  }
  return usuario
}
