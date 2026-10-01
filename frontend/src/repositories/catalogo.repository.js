import { createReadOnlyRepository } from './createRepository.js'
import { readTable } from './db.js'

// Entidades de HU-2: HU-1 solo las lee.
export const categoriasRepository = createReadOnlyRepository('categorias')
export const ambientesRepository = createReadOnlyRepository('ambientes')

// Listas de valores (strings), sin id.
export const unidadesRepository = { findAll: () => readTable('unidades') }
export const vinculosRepository = { findAll: () => readTable('vinculos') }
