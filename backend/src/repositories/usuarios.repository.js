import { pool } from '../db/pool.js'

// las especialidades llegan como 'cat-01,cat-02' y se pasan a lista
const SELECT_USUARIO = `
  SELECT u.*,
    (SELECT GROUP_CONCAT(e.categoria_id ORDER BY e.categoria_id)
     FROM usuario_especialidades e WHERE e.usuario_id = u.id) AS especialidades
  FROM usuarios u`

// de columnas de MySQL a los nombres del contrato de datos
function aUsuario(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    correo: fila.correo,
    telefono: fila.telefono,
    rol: fila.rol,
    unidad: fila.unidad,
    vinculo: fila.vinculo,
    especialidades: fila.especialidades ? fila.especialidades.split(',') : [],
    ambienteHabitualId: fila.ambiente_habitual_id,
    estado: fila.estado,
    motivoBloqueo: fila.motivo_bloqueo,
    passwordHash: fila.password_hash,
    intentosFallidos: fila.intentos_fallidos,
    bloqueadoHasta: fila.bloqueado_hasta,
    aceptaTerminos: fila.acepta_terminos,
    invitacionId: fila.invitacion_id,
    ultimoAccesoEn: fila.ultimo_acceso_en,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }
}

// db puede ser el pool o la conexión de una transacción
export const usuariosRepository = {
  async buscarPorId(id, db = pool) {
    const [filas] = await db.query(`${SELECT_USUARIO} WHERE u.id = ?`, [id])
    return aUsuario(filas[0])
  },

  async buscarPorCorreo(correo, db = pool) {
    const [filas] = await db.query(`${SELECT_USUARIO} WHERE u.correo = ?`, [correo])
    return aUsuario(filas[0])
  },

  async insertar(usuario, db = pool) {
    await db.query(
      `INSERT INTO usuarios (id, nombres, apellidos, correo, telefono, rol, unidad, vinculo, ambiente_habitual_id,
        estado, password_hash, acepta_terminos, invitacion_id, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario.id, usuario.nombres, usuario.apellidos, usuario.correo, usuario.telefono, usuario.rol, usuario.unidad,
        usuario.vinculo, usuario.ambienteHabitualId, usuario.estado, usuario.passwordHash, usuario.aceptaTerminos,
        usuario.invitacionId, usuario.creadoEn, usuario.actualizadoEn],
    )
    if (usuario.especialidades.length > 0) {
      await db.query('INSERT INTO usuario_especialidades (usuario_id, categoria_id) VALUES ?', [
        usuario.especialidades.map((categoriaId) => [usuario.id, categoriaId]),
      ])
    }
  },

  async guardarIntentos(id, { intentosFallidos, bloqueadoHasta }, db = pool) {
    await db.query('UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?', [
      intentosFallidos, bloqueadoHasta, id,
    ])
  },

  // un ingreso correcto limpia los intentos fallidos
  async registrarAcceso(id, fecha, db = pool) {
    await db.query(
      'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso_en = ? WHERE id = ?',
      [fecha, id],
    )
  },

  async actualizarPerfil(id, perfil, fecha, db = pool) {
    await db.query(
      `UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ?, unidad = ?, ambiente_habitual_id = ?,
        actualizado_en = ? WHERE id = ?`,
      [perfil.nombres, perfil.apellidos, perfil.telefono, perfil.unidad, perfil.ambienteHabitualId, fecha, id],
    )
  },

  async actualizarPassword(id, passwordHash, fecha, db = pool) {
    await db.query('UPDATE usuarios SET password_hash = ?, actualizado_en = ? WHERE id = ?', [passwordHash, fecha, id])
  },

  // al restablecer también se quita el bloqueo por intentos (no el del supervisor)
  async restablecerPassword(id, passwordHash, fecha, db = pool) {
    await db.query(
      `UPDATE usuarios SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado_en = ?
       WHERE id = ?`,
      [passwordHash, fecha, id],
    )
  },
}
