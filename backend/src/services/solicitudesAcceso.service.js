import { solicitudesAccesoRepository } from '../repositories/solicitudesAcceso.repository.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'

const RECURSO_MAX_LENGTH = 120

function solicitudRepetida(recurso) {
  return new ServiceError(
    409,
    'ACCESS_REQUEST_EXISTS',
    `Ya habías solicitado acceso a ${recurso}. Infraestructura y Servicios está revisando tu solicitud.`,
  )
}

// "Solicitar acceso" desde la vista 403 (p11). Lo revisa Infraestructura y Servicios.
export async function solicitar(usuarioId, datos) {
  const { recurso } = datos ?? {}
  const nombre = typeof recurso === 'string' ? recurso.trim() : ''
  if (!nombre || nombre.length > RECURSO_MAX_LENGTH) {
    throw validationError({ recurso: 'Indica la sección a la que necesitas acceso.' })
  }
  if (await solicitudesAccesoRepository.existe(usuarioId, nombre)) throw solicitudRepetida(nombre)

  try {
    return await solicitudesAccesoRepository.insertar({ usuarioId, recurso: nombre, creadaEn: new Date() })
  } catch (error) {
    // dos clics a la vez: el UNIQUE (usuario_id, recurso) frena el segundo
    if (error.code === 'ER_DUP_ENTRY') throw solicitudRepetida(nombre)
    throw error
  }
}
