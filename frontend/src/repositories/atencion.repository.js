import { createRepository } from './createRepository.js'

// Entidades de HU-5 (atención y cierre). Las demás historias solo las leen.
export const bitacoraRepository = createRepository('bitacora')
