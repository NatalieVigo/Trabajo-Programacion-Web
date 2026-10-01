import { createRepository } from './createRepository.js'

/** Solicitudes de acceso que se envían desde la vista 403: { id, usuarioId, recurso, creadaEn }. */
export const solicitudesAccesoRepository = createRepository('solicitudesAcceso')
