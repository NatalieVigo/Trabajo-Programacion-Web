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
import { estadoEfectivo } from './estadoInvitacion.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { emailTakenError, insertarCuenta } from './usuarios.service.js'

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000
const UNIDAD_INFRAESTRUCTURA = 'Dirección de Infraestructura y Servicios'
const INVITACION_PENDIENTE = 'Ya hay una invitación pendiente para este correo.'

const NO_PENDIENTE = {
  aceptada: 'Esta invitación ya fue aceptada.',
  rechazada: 'Esta invitación fue rechazada.',
  revocada: 'Esta invitación fue revocada por el supervisor.',
}

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

export function obtenerPorToken(token) {
  return simulateRequest(() => presentarUna(buscarPorToken(token)))
}

// Activa la cuenta del invitado (HU-1) y deja la invitación como aceptada.
export function aceptar(token, datos) {
  return simulateRequest(async () => {
    assertPendiente(buscarPorToken(token))
    const categorias = categoriasRepository.findAll({ activa: true }).map((categoria) => categoria.id)
    const fieldErrors = validateActivacion(datos ?? {}, { categorias })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const credenciales = await createPasswordCredentials(datos.password)
    // se relee después del hash para que no haya un await entre leer y escribir
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

// token aleatorio de 96 bits; la invitación vence a los 7 días
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
