import { createRepository } from './createRepository.js'
import { readTable } from './db.js'

// Tablas del catálogo (HU-2); las otras historias solo las leen.
export const categoriasRepository = createRepository('categorias')
export const subcategoriasRepository = createRepository('subcategorias')
export const sedesRepository = createRepository('sedes')
export const pabellonesRepository = createRepository('pabellones')
export const ambientesRepository = createRepository('ambientes')
export const habilitacionesRepository = createRepository('habilitaciones')

// listas simples de texto, sin id
export const unidadesRepository = { findAll: () => readTable('unidades') }
export const vinculosRepository = { findAll: () => readTable('vinculos') }
