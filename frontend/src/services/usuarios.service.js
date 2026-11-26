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
const CAMPOS_PERFIL = ['nombres', 'apellidos', 'telefono', 'unidad', 'ambienteHabitualId']

function pick(objeto, campos) {
  const presentes = campos.filter((campo) => Object.hasOwn(objeto, campo))
  return Object.fromEntries(presentes.map((campo) => [campo, objeto[campo]]))
}

export function sanitizeUsuario(usuario) {
  return Object.fromEntries(Object.entries(usuario).filter(([field]) => !PRIVATE_FIELDS.has(field)))
}

// lo usan el registro y las invitaciones
export function emailTakenError() {
  return new ServiceError(409, 'EMAIL_TAKEN', VALIDATION_MESSAGES.correoTaken, {
    correo: VALIDATION_MESSAGES.correoTaken,
  })
}

// alta compartida por el registro y las invitaciones
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

// Registro público (HU-1). Vuelve a validar, como haría el servidor.
export function registrar(datos) {
  return simulateRequest(async () => {
    const fieldErrors = validateRegistro(datos ?? {}, {
      unidades: unidadesRepository.findAll(),
      vinculos: vinculosRepository.findAll(),
    })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const credenciales = await createPasswordCredentials(datos.password)
    // el correo se revisa después del hash para no tener un await en medio
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

// Solo cambia datos personales; correo, rol o contraseña se ignoran si vienen.
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

export function obtenerResumenCuenta(id) {
  return simulateRequest(() => resumenDeCuenta(buscarUsuario(id)))
}
