import { pool } from '../db/pool.js'

function aEnlace(fila) {
  if (!fila) return null
  return {
    token: fila.token,
    usuarioId: fila.usuario_id,
    creadoEn: fila.creado_en,
    venceEn: fila.vence_en,
    usadoEn: fila.usado_en,
  }
}

export const tokensRecuperacionRepository = {
  async crear({ token, usuarioId, creadoEn, venceEn }, db = pool) {
    await db.query('INSERT INTO tokens_recuperacion (token, usuario_id, creado_en, vence_en) VALUES (?, ?, ?, ?)', [
      token, usuarioId, creadoEn, venceEn,
    ])
  },

  // solo vale el último enlace: los anteriores sin usar se borran
  async borrarSinUsar(usuarioId, db = pool) {
    await db.query('DELETE FROM tokens_recuperacion WHERE usuario_id = ? AND usado_en IS NULL', [usuarioId])
  },

  async buscar(token, db = pool, { bloquear = false } = {}) {
    const [filas] = await db.query(
      `SELECT * FROM tokens_recuperacion WHERE token = ?${bloquear ? ' FOR UPDATE' : ''}`,
      [token],
    )
    return aEnlace(filas[0])
  },

  async marcarUsado(token, fecha, db = pool) {
    await db.query('UPDATE tokens_recuperacion SET usado_en = ? WHERE token = ?', [fecha, token])
  },
}
