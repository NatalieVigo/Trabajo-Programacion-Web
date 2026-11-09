import { pool } from '../db/pool.js'

// se llenan desde la vista 403
export const solicitudesAccesoRepository = {
  async existe(usuarioId, recurso, db = pool) {
    const [filas] = await db.query('SELECT 1 FROM solicitudes_acceso WHERE usuario_id = ? AND recurso = ? LIMIT 1', [
      usuarioId, recurso,
    ])
    return filas.length > 0
  },

  async insertar({ usuarioId, recurso, creadaEn }, db = pool) {
    const [resultado] = await db.query(
      'INSERT INTO solicitudes_acceso (usuario_id, recurso, creada_en) VALUES (?, ?, ?)',
      [usuarioId, recurso, creadaEn],
    )
    return { id: resultado.insertId, usuarioId, recurso, creadaEn }
  },
}
