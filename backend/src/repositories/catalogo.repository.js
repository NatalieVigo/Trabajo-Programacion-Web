import { pool } from '../db/pool.js'

// Listas que usan los formularios de HU-1. Unidades y vínculos son de HU-1;
// categorías y ambientes son de HU-2 y aquí solo se leen.
export const catalogoRepository = {
  async listarUnidades() {
    const [filas] = await pool.query('SELECT nombre FROM unidades ORDER BY id')
    return filas.map((fila) => fila.nombre)
  },

  async listarVinculos() {
    const [filas] = await pool.query('SELECT nombre FROM vinculos ORDER BY id')
    return filas.map((fila) => fila.nombre)
  },

  async listarCategoriasActivas() {
    const [filas] = await pool.query('SELECT id, nombre FROM categorias WHERE activa = TRUE ORDER BY id')
    return filas
  },

  async listarAmbientes() {
    const [filas] = await pool.query('SELECT id, codigo, nombre FROM ambientes ORDER BY codigo')
    return filas
  },
}
