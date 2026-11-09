import { pool } from '../db/pool.js'

// intentos fallidos con correos sin cuenta, una fila por correo
export const intentosAccesoRepository = {
  async buscar(correo, db = pool) {
    const [filas] = await db.query('SELECT * FROM intentos_acceso WHERE correo = ?', [correo])
    const fila = filas[0]
    return fila ? { intentosFallidos: fila.intentos_fallidos, bloqueadoHasta: fila.bloqueado_hasta } : null
  },

  // crea la fila la primera vez y la actualiza las siguientes
  async guardar(correo, { intentosFallidos, bloqueadoHasta }, db = pool) {
    await db.query(
      `INSERT INTO intentos_acceso (correo, intentos_fallidos, bloqueado_hasta) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE intentos_fallidos = ?, bloqueado_hasta = ?`,
      [correo, intentosFallidos, bloqueadoHasta, intentosFallidos, bloqueadoHasta],
    )
  },
}
