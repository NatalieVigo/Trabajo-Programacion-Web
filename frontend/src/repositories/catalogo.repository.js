import { createRepository } from './createRepository.js'
import { readTable } from './db.js'

// Entidades de HU-2 (catálogo de servicios). Las demás historias solo las leen.
export const categoriasRepository = createRepository('categorias')
export const subcategoriasRepository = createRepository('subcategorias')
export const sedesRepository = createRepository('sedes')
export const pabellonesRepository = createRepository('pabellones')
export const ambientesRepository = createRepository('ambientes')
export const habilitacionesRepository = createRepository('habilitaciones')

// Listas de valores (strings), sin id.
export const unidadesRepository = { findAll: () => readTable('unidades') }
export const vinculosRepository = { findAll: () => readTable('vinculos') }
