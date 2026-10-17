import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { ServiceError } from './ServiceError.js'

// hace el chequeo que haría el servidor con la sesión (catálogo y cola)
export function exigirSupervisorActivo(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  if (usuario?.rol !== 'supervisor' || usuario.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor activo puede realizar esta acción.')
  }
  return usuario
}
