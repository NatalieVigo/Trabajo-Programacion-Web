import { createReadOnlyRepository } from './createRepository.js'

// Entidades de HU-3 (tickets) y HU-6 (encuestas): HU-1 solo las lee para sus contadores.
export const ticketsRepository = createReadOnlyRepository('tickets')
export const encuestasRepository = createReadOnlyRepository('encuestas')
