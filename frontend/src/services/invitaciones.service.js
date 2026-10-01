import { categoriasRepository } from '../repositories/catalogo.repository.js'
import { invitacionesRepository } from '../repositories/invitaciones.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatDate, getFullName } from '../utils/format.js'
import { nextId, randomHex } from '../utils/ids.js'
import { createPasswordCredentials } from '../utils/password.js'
import {
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateActivacion,
  validateInvitacion,
} from '../utils/validators.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { emailTakenError, insertarCuenta } from './usuarios.service.js'

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000
const UNIDAD_INFRAESTRUCTURA = 'Dirección de Infraestructura y Servicios'
const ESTADOS = ['pendiente', 'vencida', 'aceptada', 'rechazada', 'revocada']
const INVITACION_PENDIENTE = 'Ya hay una invitación pendiente para este correo.'

const NO_PENDIENTE = {
  aceptada: 'Esta invitación ya fue aceptada.',
  rechazada: 'Esta invitación fue rechazada.',
  revocada: 'Esta invitación fue revocada por el supervisor.',
}

/** Una invitación pendiente cuyo plazo ya pasó está «vencida». Es un estado derivado: no se guarda. */
function estadoEfectivo(invitacion, ahora = Date.now()) {
  const vencida = invitacion.estado === 'pendiente' && Date.parse(invitacion.venceEn) < ahora
  return vencida ? 'vencida' : invitacion.estado
}

/** Invitaciones tal como las devuelve la API: con su estado efectivo y el nombre de quien invitó. */
function presentar(invitaciones) {
  const nombres = new Map(usuariosRepository.findAll().map((usuario) => [usuario.id, getFullName(usuario)]))
  const ahora = Date.now()
  return invitaciones.map((invitacion) => ({
    ...invitacion,
    estadoEfectivo: estadoEfectivo(invitacion, ahora),
    invitadoPorNombre: nombres.get(invitacion.invitadoPor) ?? null,
  }))
}

const presentarUna = (invitacion) => presentar([invitacion])[0]

function notFoundError() {
  return new ServiceError(404, 'INVITATION_NOT_FOUND', 'No encontramos esta invitación.')
}

function buscarPorToken(token) {
  const invitacion = invitacionesRepository.findByToken(token)
  if (!invitacion) throw notFoundError()
  return invitacion
}

/** Solo una invitación pendiente y vigente admite cambios: si no, 410 INVITATION_EXPIRED o 409 INVITATION_NOT_PENDING. */
function assertPendiente(invitacion) {
  const estado = estadoEfectivo(invitacion)
  if (estado === 'vencida') {
    const mensaje = `Esta invitación venció el ${formatDate(invitacion.venceEn)}.`
    throw new ServiceError(410, 'INVITATION_EXPIRED', mensaje, null, { details: { venceEn: invitacion.venceEn } })
  }
  if (estado !== 'pendiente') {
    throw new ServiceError(409, 'INVITATION_NOT_PENDING', NO_PENDIENTE[estado], null, { details: { estado } })
  }
  return invitacion
}

/** Invitación del enlace /invitacion/:token con su estado efectivo. Falla con 404 INVITATION_NOT_FOUND. */
export function obtenerPorToken(token) {
  return simulateRequest(() => presentarUna(buscarPorToken(token)))
}

/**
 * Activa la cuenta del invitado (HU-1 · 1.2): crea el usuario con el rol, los nombres y el correo de la invitación,
 * el teléfono que confirma y de una a tres especialidades activas, y marca la invitación como aceptada.
 * Falla con 404, 410 INVITATION_EXPIRED, 409 INVITATION_NOT_PENDING, 400 VALIDATION_ERROR o 409 EMAIL_TAKEN.
 * Devuelve el usuario sin credenciales.
 */
export function aceptar(token, datos) {
  return simulateRequest(async () => {
    assertPendiente(buscarPorToken(token))
    const categorias = categoriasRepository.findAll({ activa: true }).map((categoria) => categoria.id)
    const fieldErrors = validateActivacion(datos ?? {}, { categorias })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const credenciales = await createPasswordCredentials(datos.password)
    // Tras el hash se vuelve a leer la invitación: entre la consulta y las escrituras no media ningún await.
    const invitacion = assertPendiente(buscarPorToken(token))
    if (usuariosRepository.findByCorreo(invitacion.correo)) throw emailTakenError()

    const usuario = insertarCuenta({
      nombres: invitacion.nombres,
      apellidos: invitacion.apellidos,
      correo: invitacion.correo,
      telefono: normalizeTelefono(datos.telefono),
      rol: invitacion.rol,
      unidad: UNIDAD_INFRAESTRUCTURA,
      vinculo: null,
      especialidades: [...new Set(datos.especialidades)],
      ...credenciales,
      aceptaTerminos: true,
      invitacionId: invitacion.id,
    })
    invitacionesRepository.update(invitacion.id, { estado: 'aceptada', respondidaEn: usuario.creadoEn })
    return usuario
  })
}

/** El invitado rechaza su invitación pendiente y vigente. Falla con 404, 410 o 409. */
export function rechazar(token) {
  return simulateRequest(() => {
    const invitacion = assertPendiente(buscarPorToken(token))
    const rechazada = invitacionesRepository.update(invitacion.id, {
      estado: 'rechazada',
      respondidaEn: new Date().toISOString(),
    })
    return presentarUna(rechazada)
  })
}

/** Invitaciones de la más reciente a la más antigua. `estado` filtra por estado efectivo (admite «vencida»). */
export function listar({ estado } = {}) {
  return simulateRequest(() => {
    if (estado && !ESTADOS.includes(estado)) {
      throw validationError({ estado: 'Elige un estado de invitación válido.' })
    }
    return presentar(invitacionesRepository.findAll())
      .filter((invitacion) => !estado || invitacion.estadoEfectivo === estado)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
  })
}

/**
 * Un supervisor activo invita a un técnico o a otro supervisor. El enlace usa un token aleatorio de 96 bits y vence
 * a los 7 días. Falla con 403 FORBIDDEN, 400 VALIDATION_ERROR, 409 EMAIL_TAKEN (el correo ya tiene cuenta) o
 * 409 INVITATION_PENDING (el correo ya tiene una invitación vigente).
 */
export function crear(datos, invitadoPorId) {
  return simulateRequest(() => {
    const invitador = usuariosRepository.findById(invitadoPorId)
    if (invitador?.rol !== 'supervisor' || invitador.estado !== 'activo') {
      throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor puede enviar invitaciones.')
    }
    const fieldErrors = validateInvitacion(datos ?? {})
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const correo = normalizeCorreo(datos.correo)
    if (usuariosRepository.findByCorreo(correo)) throw emailTakenError()
    const pendientes = invitacionesRepository.findAll({ correo })
    if (pendientes.some((invitacion) => estadoEfectivo(invitacion) === 'pendiente')) {
      throw new ServiceError(409, 'INVITATION_PENDING', INVITACION_PENDIENTE, { correo: INVITACION_PENDIENTE })
    }

    const creadaEn = new Date()
    const invitacion = invitacionesRepository.insert({
      id: nextId('inv', invitacionesRepository.findAll()),
      token: `INV-${randomHex(12).toUpperCase()}`,
      nombres: normalizeNombre(datos.nombres),
      apellidos: normalizeNombre(datos.apellidos),
      correo,
      rol: datos.rol,
      telefono: normalizeTelefono(datos.telefono),
      invitadoPor: invitador.id,
      estado: 'pendiente',
      venceEn: new Date(creadaEn.getTime() + VIGENCIA_MS).toISOString(),
      creadaEn: creadaEn.toISOString(),
      respondidaEn: null,
    })
    return presentarUna(invitacion)
  })
}

/** El supervisor anula una invitación pendiente y vigente. Falla con 404, 410 o 409. */
export function revocar(id) {
  return simulateRequest(() => {
    const invitacion = invitacionesRepository.findById(id)
    if (!invitacion) throw notFoundError()
    assertPendiente(invitacion)
    return presentarUna(invitacionesRepository.update(id, { estado: 'revocada' }))
  })
}
