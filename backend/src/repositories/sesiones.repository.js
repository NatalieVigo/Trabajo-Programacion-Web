import { pool } from '../db/pool.js'

export const sesionesRepository = {
  async crear({ id, usuarioId, creadaEn, venceEn }, db = pool) {
    await db.query('INSERT INTO sesiones (id, usuario_id, creada_en, vence_en) VALUES (?, ?, ?, ?)', [
      id, usuarioId, creadaEn, venceEn,
    ])
  },

  // solo cuenta si no se cerró y no venció
  async buscarVigente(id, ahora, db = pool) {
    const [filas] = await db.query(
      'SELECT id, usuario_id FROM sesiones WHERE id = ? AND cerrada_en IS NULL AND vence_en > ?',
      [id, ahora],
    )
    return filas[0] ? { id: filas[0].id, usuarioId: filas[0].usuario_id } : null
  },

  async cerrar(id, fecha, db = pool) {
    await db.query('UPDATE sesiones SET cerrada_en = ? WHERE id = ? AND cerrada_en IS NULL', [fecha, id])
  },

  async cerrarTodas(usuarioId, fecha, db = pool) {
    await db.query('UPDATE sesiones SET cerrada_en = ? WHERE usuario_id = ? AND cerrada_en IS NULL', [fecha, usuarioId])
  },
}
