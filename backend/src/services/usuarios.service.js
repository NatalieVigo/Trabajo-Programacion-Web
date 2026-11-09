import { enTransaccion, siguienteId } from '../db/pool.js'
import { catalogoRepository } from '../repositories/catalogo.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { hashPassword } from '../utils/password.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import {
  VALIDATION_MESSAGES,
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateCorreo,
  validatePerfil,
  validateRegistro,
} from '../utils/validators.js'

const CAMPOS_PERFIL = ['nombres', 'apellidos', 'telefono', 'unidad', 'ambienteHabitualId']

function pick(objeto, campos) {
  const presentes = campos.filter((campo) => Object.hasOwn(objeto, campo))
  return Object.fromEntries(presentes.map((campo) => [campo, objeto[campo]]))
}

// lo que la API muestra de una cuenta: nunca el hash ni los intentos fallidos
export function usuarioPublico(usuario) {
  const { id, nombres, apellidos, correo, telefono, rol, unidad, vinculo, especialidades, ambienteHabitualId, estado,
    ultimoAccesoEn, creadoEn, actualizadoEn } = usuario
  return { id, nombres, apellidos, correo, telefono, rol, unidad, vinculo, especialidades, ambienteHabitualId, estado,
    ultimoAccesoEn, creadoEn, actualizadoEn }
}

// lo usan el registro y las invitaciones
export function emailTakenError() {
  return new ServiceError(409, 'EMAIL_TAKEN', VALIDATION_MESSAGES.correoTaken, {
    correo: VALIDATION_MESSAGES.correoTaken,
  })
}

// alta compartida por el registro y las invitaciones; db es la conexión de la transacción
export async function insertarCuenta(datos, db) {
  const ahora = new Date()
  const id = await siguienteId(db, 'usuarios', 'usr')
  try {
    await usuariosRepository.insertar(
      { id, ...datos, ambienteHabitualId: null, estado: 'activo', creadoEn: ahora, actualizadoEn: ahora },
      db,
    )
  } catch (error) {
    // si dos personas se registran a la vez con el mismo correo, el UNIQUE de la base frena a la segunda
    if (error.code === 'ER_DUP_ENTRY') throw emailTakenError()
    throw error
  }
  return usuarioPublico(await usuariosRepository.buscarPorId(id, db))
}

// Registro público (p06). Siempre crea el rol usuario.
export async function registrar(datos) {
  const [unidades, vinculos] = await Promise.all([catalogoRepository.listarUnidades(), catalogoRepository.listarVinculos()])
  const fieldErrors = validateRegistro(datos ?? {}, { unidades, vinculos })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const passwordHash = await hashPassword(datos.password)
  const correo = normalizeCorreo(datos.correo)
  return enTransaccion(async (db) => {
    if (await usuariosRepository.buscarPorCorreo(correo, db)) throw emailTakenError()
    return insertarCuenta(
      {
        nombres: normalizeNombre(datos.nombres),
        apellidos: normalizeNombre(datos.apellidos),
        correo,
        telefono: normalizeTelefono(datos.telefono),
        rol: 'usuario',
        unidad: datos.unidad,
        vinculo: datos.vinculo,
        especialidades: [],
        passwordHash,
        aceptaTerminos: true,
        invitacionId: null,
      },
      db,
    )
  })
}

// "Correo válido y disponible." del registro (p06)
export async function correoDisponible(correo) {
  const error = validateCorreo(correo)
  if (error) throw validationError({ correo: error })
  return { disponible: !(await usuariosRepository.buscarPorCorreo(normalizeCorreo(correo))) }
}

export async function opcionesRegistro() {
  const [unidades, vinculos] = await Promise.all([catalogoRepository.listarUnidades(), catalogoRepository.listarVinculos()])
  return { unidades, vinculos }
}

async function buscarUsuario(id) {
  const usuario = await usuariosRepository.buscarPorId(id)
  if (!usuario) throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
  return usuario
}

export async function obtenerCuenta(id) {
  return usuarioPublico(await buscarUsuario(id))
}

// Mi cuenta (p10). Solo cambia datos personales; correo, rol o contraseña se ignoran si vienen.
export async function actualizarPerfil(id, cambios) {
  const usuario = await buscarUsuario(id)
  const perfil = { ...pick(usuario, CAMPOS_PERFIL), ...pick(cambios ?? {}, CAMPOS_PERFIL) }
  const [unidades, ambientes] = await Promise.all([catalogoRepository.listarUnidades(), catalogoRepository.listarAmbientes()])
  const fieldErrors = validatePerfil(perfil, { unidades, ambientes: ambientes.map((ambiente) => ambiente.id) })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  await usuariosRepository.actualizarPerfil(
    usuario.id,
    {
      nombres: normalizeNombre(perfil.nombres),
      apellidos: normalizeNombre(perfil.apellidos),
      telefono: normalizeTelefono(perfil.telefono),
      unidad: perfil.unidad,
      ambienteHabitualId: perfil.ambienteHabitualId || null,
    },
    new Date(),
  )
  return usuarioPublico(await usuariosRepository.buscarPorId(usuario.id))
}

export async function opcionesCuenta() {
  const [unidades, ambientes] = await Promise.all([catalogoRepository.listarUnidades(), catalogoRepository.listarAmbientes()])
  return { unidades, ambientes }
}
