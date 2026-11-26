import { solicitudesAccesoRepository } from '../repositories/solicitudesAcceso.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { nextId } from '../utils/ids.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

const RECURSO_MAX_LENGTH = 120

// Pedido de acceso desde la vista 403 (HU-1). Lo revisa Infraestructura y Servicios.
export function solicitar(usuarioId, recurso) {
  return simulateRequest(() => {
    const usuario = usuariosRepository.findById(usuarioId)
    if (usuario?.estado !== 'activo') {
      throw new ServiceError(401, 'UNAUTHENTICATED', 'Inicia sesión para solicitar acceso.')
    }
    const nombre = typeof recurso === 'string' ? recurso.trim() : ''
    if (!nombre || nombre.length > RECURSO_MAX_LENGTH) {
      throw validationError({ recurso: 'Indica la sección a la que necesitas acceso.' })
    }
    if (solicitudesAccesoRepository.findOne({ usuarioId: usuario.id, recurso: nombre })) {
      throw new ServiceError(
        409,
        'ACCESS_REQUEST_EXISTS',
        `Ya habías solicitado acceso a ${nombre}. Infraestructura y Servicios está revisando tu solicitud.`,
      )
    }

    return solicitudesAccesoRepository.insert({
      id: nextId('sol', solicitudesAccesoRepository.findAll()),
      usuarioId: usuario.id,
      recurso: nombre,
      creadaEn: new Date().toISOString(),
    })
  })
}
