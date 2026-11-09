import { pool } from '../db/pool.js'

const ESTADOS_ABIERTOS = ['abierto', 'en_atencion', 'en_espera', 'reabierto']
const ESTADOS_EN_COLA = ['abierto', 'reabierto']

// Conteos sobre tickets (HU-3) y encuestas (HU-6), que HU-1 solo lee.
export const resumenRepository = {
  async contarTicketsDelUsuario(usuarioId) {
    const [[fila]] = await pool.query(
      'SELECT COUNT(*) AS reportados, SUM(estado IN (?)) AS abiertos FROM tickets WHERE usuario_id = ?',
      [ESTADOS_ABIERTOS, usuarioId],
    )
    return { reportados: Number(fila.reportados), abiertos: Number(fila.abiertos ?? 0) }
  },

  async contarEncuestasRespondidas(usuarioId) {
    const [[fila]] = await pool.query('SELECT COUNT(*) AS total FROM encuestas WHERE usuario_id = ?', [usuarioId])
    return Number(fila.total)
  },

  // tickets cerrados desde la fecha indicada que aún no tienen encuesta, el más antiguo primero
  async cerradosSinEncuesta(usuarioId, desde) {
    const [filas] = await pool.query(
      `SELECT t.codigo, t.cerrado_en FROM tickets t
       LEFT JOIN encuestas e ON e.ticket_id = t.id
       WHERE t.usuario_id = ? AND t.estado = 'cerrado' AND e.id IS NULL AND t.cerrado_en >= ?
       ORDER BY t.cerrado_en`,
      [usuarioId, desde],
    )
    return filas.map((fila) => ({ codigo: fila.codigo, cerradoEn: fila.cerrado_en }))
  },

  async contarAsignados(tecnicoId) {
    const [[fila]] = await pool.query('SELECT COUNT(*) AS total FROM tickets WHERE asignado_a = ?', [tecnicoId])
    return Number(fila.total)
  },

  async contarColaSinAsignar() {
    const [[fila]] = await pool.query(
      'SELECT COUNT(*) AS total FROM tickets WHERE asignado_a IS NULL AND estado IN (?)',
      [ESTADOS_EN_COLA],
    )
    return Number(fila.total)
  },
}
