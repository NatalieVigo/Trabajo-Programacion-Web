import { createReadOnlyRepository, createRepository } from './createRepository.js'

// HU-3 crea los tickets; las otras historias usan este mismo repositorio.
export const ticketsRepository = createRepository('tickets')
export const encuestasRepository = createReadOnlyRepository('encuestas')
