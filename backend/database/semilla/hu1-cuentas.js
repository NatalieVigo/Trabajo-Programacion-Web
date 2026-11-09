import { createHash } from 'node:crypto'
import { hashPassword } from '../../src/utils/password.js'
import { fecha, insertarFilas } from './insertarFilas.js'

// contraseñas de demo; el seed del frontend guarda sha256(sal + contraseña)
const CONTRASENAS_DEMO = {
  'camila.quispe@aloe.ulima.edu.pe': 'Camila2026',
  'jparedes@ulima.edu.pe': 'Tecnico2026',
  'lmendoza@ulima.edu.pe': 'Supervisor2026',
  'diego.salas@aloe.ulima.edu.pe': 'Usuario2026',
}
const CONTRASENA_DEMO_GENERAL = 'Demo2026'

// comprueba que la contraseña de demo sea la del seed y la vuelve a cifrar con bcrypt
async function cifrarDesdeSeed({ correo, passwordSalt, passwordHash }) {
  const password = CONTRASENAS_DEMO[correo] ?? CONTRASENA_DEMO_GENERAL
  const delSeed = createHash('sha256').update(passwordSalt + password).digest('hex')
  if (delSeed !== passwordHash) throw new Error(`La contraseña de demo de ${correo} no coincide con el seed.`)
  return hashPassword(password)
}

// HU-1: unidades, vínculos, usuarios con sus especialidades e invitaciones
export async function cargarCuentas(conexion, seed) {
  await insertarFilas(conexion, 'unidades', ['nombre'], seed.unidades.map((nombre) => [nombre]))
  await insertarFilas(conexion, 'vinculos', ['nombre'], seed.vinculos.map((nombre) => [nombre]))

  const hashes = await Promise.all(seed.usuarios.map(cifrarDesdeSeed))
  await insertarFilas(
    conexion,
    'usuarios',
    ['id', 'nombres', 'apellidos', 'correo', 'telefono', 'rol', 'unidad', 'vinculo', 'ambiente_habitual_id', 'estado',
      'motivo_bloqueo', 'password_hash', 'intentos_fallidos', 'bloqueado_hasta', 'acepta_terminos', 'invitacion_id',
      'creado_en', 'actualizado_en'],
    seed.usuarios.map((usuario, i) => [
      usuario.id, usuario.nombres, usuario.apellidos, usuario.correo, usuario.telefono, usuario.rol, usuario.unidad,
      usuario.vinculo, usuario.ambienteHabitualId, usuario.estado, usuario.motivoBloqueo, hashes[i],
      usuario.intentosFallidos, fecha(usuario.bloqueadoHasta), usuario.aceptaTerminos, usuario.invitacionId,
      fecha(usuario.creadoEn), fecha(usuario.actualizadoEn),
    ]),
  )
  await insertarFilas(
    conexion,
    'usuario_especialidades',
    ['usuario_id', 'categoria_id'],
    seed.usuarios.flatMap((usuario) => usuario.especialidades.map((categoriaId) => [usuario.id, categoriaId])),
  )
  await insertarFilas(
    conexion,
    'invitaciones',
    ['id', 'token', 'nombres', 'apellidos', 'correo', 'rol', 'telefono', 'invitado_por', 'estado', 'vence_en',
      'creada_en', 'respondida_en'],
    seed.invitaciones.map((invitacion) => [
      invitacion.id, invitacion.token, invitacion.nombres, invitacion.apellidos, invitacion.correo, invitacion.rol,
      invitacion.telefono, invitacion.invitadoPor, invitacion.estado, fecha(invitacion.venceEn),
      fecha(invitacion.creadaEn), fecha(invitacion.respondidaEn),
    ]),
  )
}
