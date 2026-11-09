import { pool } from '../db/pool.js'

const SELECT_INVITACION = `
  SELECT i.*, CONCAT(u.nombres, ' ', u.apellidos) AS invitado_por_nombre
  FROM invitaciones i
  LEFT JOIN usuarios u ON u.id = i.invitado_por`

function aInvitacion(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    token: fila.token,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    correo: fila.correo,
    rol: fila.rol,
    telefono: fila.telefono,
    invitadoPor: fila.invitado_por,
    invitadoPorNombre: fila.invitado_por_nombre,
    estado: fila.estado,
    venceEn: fila.vence_en,
    creadaEn: fila.creada_en,
    respondidaEn: fila.respondida_en,
  }
}

export const invitacionesRepository = {
  // con bloquear, otra transacción no puede responder la misma invitación a la vez
  async buscarPorToken(token, db = pool, { bloquear = false } = {}) {
    const [filas] = await db.query(`${SELECT_INVITACION} WHERE i.token = ?${bloquear ? ' FOR UPDATE' : ''}`, [token])
    return aInvitacion(filas[0])
  },

  async hayPendiente(correo, ahora, db = pool) {
    const [filas] = await db.query(
      "SELECT 1 FROM invitaciones WHERE correo = ? AND estado = 'pendiente' AND vence_en >= ? LIMIT 1",
      [correo, ahora],
    )
    return filas.length > 0
  },

  async insertar(invitacion, db = pool) {
    await db.query(
      `INSERT INTO invitaciones (id, token, nombres, apellidos, correo, rol, telefono, invitado_por, estado, vence_en,
        creada_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
      [invitacion.id, invitacion.token, invitacion.nombres, invitacion.apellidos, invitacion.correo, invitacion.rol,
        invitacion.telefono, invitacion.invitadoPor, invitacion.venceEn, invitacion.creadaEn],
    )
  },

  async responder(id, estado, fecha, db = pool) {
    await db.query('UPDATE invitaciones SET estado = ?, respondida_en = ? WHERE id = ?', [estado, fecha, id])
  },
}
