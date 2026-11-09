import { insertarFilas } from './insertarFilas.js'

// HU-2 (mínimo): solo las columnas que lee HU-1
export async function cargarCatalogo(conexion, seed) {
  await insertarFilas(
    conexion,
    'categorias',
    ['id', 'nombre', 'activa'],
    seed.categorias.map(({ id, nombre, activa }) => [id, nombre, activa]),
  )
  await insertarFilas(
    conexion,
    'ambientes',
    ['id', 'codigo', 'nombre'],
    seed.ambientes.map(({ id, codigo, nombre }) => [id, codigo, nombre]),
  )
}
