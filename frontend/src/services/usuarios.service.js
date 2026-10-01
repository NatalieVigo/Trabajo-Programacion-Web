import { ambientesRepository, unidadesRepository, vinculosRepository } from '../repositories/catalogo.repository.js'
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
  validatePerfil,
  validateRegistro,
} from '../utils/validators.js'
import { simulateRequest } from './request.js'
import { resumenDeCuenta } from './resumen.service.js'
import { ServiceError, validationError } from './ServiceError.js'

const PRIVATE_FIELDS = new Set(['passwordHash', 'passwordSalt'])
/** Datos personales que la persona puede cambiar desde «Mi cuenta». */
const CAMPOS_PERFIL = ['nombres', 'apellidos', 'telefono', 'unidad', 'ambienteHabitualId']

/** Solo los `campos` presentes en `objeto`. */
function pick(objeto, campos) {
  const presentes = campos.filter((campo) => Object.hasOwn(objeto, campo))
  return Object.fromEntries(presentes.map((campo) => [campo, objeto[campo]]))
}

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

function buscarUsuario(id) {
  const usuario = usuariosRepository.findById(id)
  if (!usuario) throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
  return usuario
}

export function obtenerPorId(id) {
  return simulateRequest(() => sanitizeUsuario(buscarUsuario(id)))
}

/**
 * Edición de los datos personales (HU-1 · 1.5): nombres, apellidos, teléfono, unidad y ambiente habitual (o null).
 * Cualquier otro campo de `cambios` (correo, rol, estado, contraseña…) se ignora y los que no se envían conservan su
 * valor. Vuelve a validar como lo haría el servidor y normaliza como el registro. Falla con 404 USER_NOT_FOUND o
 * 400 VALIDATION_ERROR (fieldErrors). Devuelve el usuario actualizado sin credenciales.
 */
export function actualizarPerfil(id, cambios) {
  return simulateRequest(() => {
    const usuario = buscarUsuario(id)
    const perfil = { ...pick(usuario, CAMPOS_PERFIL), ...pick(cambios ?? {}, CAMPOS_PERFIL) }
    const fieldErrors = validatePerfil(perfil, {
      unidades: unidadesRepository.findAll(),
      ambientes: ambientesRepository.findAll().map((ambiente) => ambiente.id),
    })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const actualizado = usuariosRepository.update(usuario.id, {
      nombres: normalizeNombre(perfil.nombres),
      apellidos: normalizeNombre(perfil.apellidos),
      telefono: normalizeTelefono(perfil.telefono),
      unidad: perfil.unidad,
      ambienteHabitualId: perfil.ambienteHabitualId || null,
      actualizadoEn: new Date().toISOString(),
    })
    return sanitizeUsuario(actualizado)
  })
}

/**
 * Resumen de la cuenta en «Mi cuenta» (p10), según el rol de la persona. usuario: { ticketsReportados, abiertosAhora,
 * cuentaCreada, encuestaPendiente: { ticketCodigo, cerradoEn, fechaLimite } | null } · tecnico: { ticketsAsignados,
 * enAtencion, cuentaCreada } · supervisor: { invitacionesPendientes (las que envió y siguen vigentes), cuentaCreada }.
 * Falla con 404 USER_NOT_FOUND.
 */
export function obtenerResumenCuenta(id) {
  return simulateRequest(() => resumenDeCuenta(buscarUsuario(id)))
}
