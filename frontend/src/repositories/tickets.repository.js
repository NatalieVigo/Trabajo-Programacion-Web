import { createReadOnlyRepository, createRepository } from './createRepository.js'

// HU-3 es responsable de crear tickets; las demás historias consumen este mismo repositorio.
export const ticketsRepository = createRepository('tickets')
export const encuestasRepository = createReadOnlyRepository('encuestas')
