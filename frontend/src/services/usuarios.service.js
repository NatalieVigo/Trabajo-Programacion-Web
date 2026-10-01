import { unidadesRepository, vinculosRepository } from '../repositories/catalogo.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { nextId } from '../utils/ids.js'
import { createPasswordCredentials } from '../utils/password.js'
import {
  VALIDATION_MESSAGES,
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateCorreo,
  validateRegistro,
} from '../utils/validators.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

const PRIVATE_FIELDS = new Set(['passwordHash', 'passwordSalt'])

/** Usuario apto para la interfaz: sin hash ni sal. Lo usan todos los servicios que devuelven usuarios. */
export function sanitizeUsuario(usuario) {
  return Object.fromEntries(Object.entries(usuario).filter(([field]) => !PRIVATE_FIELDS.has(field)))
}

/** 409 de un correo que ya tiene cuenta. Lo comparten el registro público y las invitaciones. */
export function emailTakenError() {
  return new ServiceError(409, 'EMAIL_TAKEN', VALIDATION_MESSAGES.correoTaken, {
    correo: VALIDATION_MESSAGES.correoTaken,
  })
}

/**
 * Inserta una cuenta activa, sin ambiente habitual, bloqueos ni intentos fallidos, y la devuelve sin credenciales.
 * `datos` trae lo propio de cada alta (registro público o invitación): datos personales, rol, credenciales…
 * Es un paso interno de los servicios que crean cuentas, no una operación de la API.
 */
export function insertarCuenta(datos) {
  const ahora = new Date().toISOString()
  const usuario = usuariosRepository.insert({
    id: nextId('usr', usuariosRepository.findAll()),
    ...datos,
    ambienteHabitualId: null,
    estado: 'activo',
    motivoBloqueo: null,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
  return sanitizeUsuario(usuario)
}

/**
 * Registro público (HU-1 · 1.1). Vuelve a validar los datos como lo haría el servidor y crea la cuenta con rol
 * usuario. Falla con 400 VALIDATION_ERROR (fieldErrors) o 409 EMAIL_TAKEN. Devuelve el usuario sin credenciales.
 */
export function registrar(datos) {
  return simulateRequest(async () => {
    const fieldErrors = validateRegistro(datos ?? {}, {
      unidades: unidadesRepository.findAll(),
      vinculos: vinculosRepository.findAll(),
    })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const credenciales = await createPasswordCredentials(datos.password)
    // La unicidad se comprueba después del hash para que entre la consulta y la inserción no medie ningún await.
    const correo = normalizeCorreo(datos.correo)
    if (usuariosRepository.findByCorreo(correo)) throw emailTakenError()

    return insertarCuenta({
      nombres: normalizeNombre(datos.nombres),
      apellidos: normalizeNombre(datos.apellidos),
      correo,
      telefono: normalizeTelefono(datos.telefono),
      rol: 'usuario',
      unidad: datos.unidad,
      vinculo: datos.vinculo,
      especialidades: [],
      ...credenciales,
      aceptaTerminos: true,
      invitacionId: null,
    })
  })
}

/** Disponibilidad de un correo para el registro: { disponible }. Falla con 400 si no es institucional. */
export function correoDisponible(correo) {
  return simulateRequest(() => {
    const error = validateCorreo(correo)
    if (error) throw validationError({ correo: error })
    return { disponible: !usuariosRepository.findByCorreo(normalizeCorreo(correo)) }
  })
}

export function obtenerPorId(id) {
  return simulateRequest(() => {
    const usuario = usuariosRepository.findById(id)
    if (!usuario) throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
    return sanitizeUsuario(usuario)
  })
}
