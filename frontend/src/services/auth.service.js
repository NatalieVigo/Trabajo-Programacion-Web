import { intentosAccesoRepository } from '../repositories/intentosAcceso.repository.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { tokensRecuperacionRepository } from '../repositories/tokensRecuperacion.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatTime } from '../utils/format.js'
import { nextId, randomHex } from '../utils/ids.js'
import { createPasswordCredentials, verifyPassword } from '../utils/password.js'
import {
  VALIDATION_MESSAGES,
  hasErrors,
  normalizeCorreo,
  validateCambioPassword,
  validateLogin,
  validateRecuperacion,
  validateRestablecimiento,
} from '../utils/validators.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { sanitizeUsuario } from './usuarios.service.js'

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15
const BLOQUEO_MS = BLOQUEO_MINUTOS * 60 * 1000
const VIGENCIA_ENLACE_MS = 30 * 60 * 1000
const CORREO_SOPORTE = 'soporte.campus@ulima.edu.pe'

// sal de relleno para hashear igual con correos sin cuenta y que el tiempo no los delate
const SAL_SIN_CUENTA = '0'.repeat(32)

function credencialesIncorrectas(intentosRestantes) {
  const quedan = intentosRestantes === 1 ? 'Te queda 1 intento' : `Te quedan ${intentosRestantes} intentos`
  return new ServiceError(
    401,
    'INVALID_CREDENTIALS',
    `Correo o contraseña incorrectos. ${quedan} antes del bloqueo temporal.`,
    null,
    { details: { intentosRestantes } },
  )
}

function cuentaBloqueadaTemporalmente(bloqueadoHasta) {
  const mensaje =
    `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos tras cinco intentos fallidos. ` +
    `Podrás ingresar a las ${formatTime(bloqueadoHasta)} o restablecer tu contraseña ahora.`
  return new ServiceError(423, 'ACCOUNT_LOCKED', mensaje, null, { details: { bloqueadoHasta } })
}

function cuentaBloqueada(motivo) {
  const texto = motivo?.trim() ?? ''
  const detalle = texto ? `: ${/[.!?]$/.test(texto) ? texto : `${texto}.`}` : '.'
  return new ServiceError(
    403,
    'ACCOUNT_BLOCKED',
    `Tu cuenta está bloqueada${detalle} Comunícate con ${CORREO_SOPORTE}.`,
    null,
    { details: { motivo: motivo ?? null } },
  )
}

const bloqueoVigente = ({ bloqueadoHasta }, ahora) => Boolean(bloqueadoHasta) && Date.parse(bloqueadoHasta) > ahora

// el quinto fallo bloquea; después de un bloqueo vencido se cuenta desde cero
function siguienteIntento({ intentosFallidos = 0, bloqueadoHasta = null }, ahora) {
  const intentos = (bloqueadoHasta ? 0 : intentosFallidos) + 1
  return {
    intentosFallidos: intentos,
    bloqueadoHasta: intentos >= MAX_INTENTOS ? new Date(ahora + BLOQUEO_MS).toISOString() : null,
  }
}

function errorDelIntento({ intentosFallidos, bloqueadoHasta }) {
  return bloqueadoHasta
    ? cuentaBloqueadaTemporalmente(bloqueadoHasta)
    : credencialesIncorrectas(MAX_INTENTOS - intentosFallidos)
}

function registrarFallo(usuario, ahora) {
  const intento = siguienteIntento(usuario, ahora)
  usuariosRepository.update(usuario.id, intento)
  return errorDelIntento(intento)
}

// los correos sin cuenta se bloquean igual, así no se revela cuáles están registrados
function registrarFalloSinCuenta(correo, ahora) {
  const registro = intentosAccesoRepository.findByCorreo(correo)
  if (registro && bloqueoVigente(registro, ahora)) return cuentaBloqueadaTemporalmente(registro.bloqueadoHasta)
  const intento = siguienteIntento(registro ?? {}, ahora)
  if (registro) {
    intentosAccesoRepository.update(registro.id, intento)
  } else {
    intentosAccesoRepository.insert({ id: nextId('int', intentosAccesoRepository.findAll()), correo, ...intento })
  }
  return errorDelIntento(intento)
}

// Login (HU-1). El bloqueo del supervisor solo se avisa con la contraseña correcta.
export function iniciarSesion(credenciales) {
  return simulateRequest(async () => {
    const { correo, password, recordar = false } = credenciales ?? {}
    const fieldErrors = validateLogin({ correo, password })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const cuenta = usuariosRepository.findByCorreo(correo)
    const passwordCorrecta = await verifyPassword(
      password,
      cuenta?.passwordSalt ?? SAL_SIN_CUENTA,
      cuenta?.passwordHash ?? '',
    )
    // se relee la cuenta después del await para no pisar otro intento
    const ahora = Date.now()
    const usuario = cuenta && usuariosRepository.findById(cuenta.id)
    if (!usuario) throw registrarFalloSinCuenta(normalizeCorreo(correo), ahora)
    if (bloqueoVigente(usuario, ahora)) throw cuentaBloqueadaTemporalmente(usuario.bloqueadoHasta)
    if (!passwordCorrecta) throw registrarFallo(usuario, ahora)
    if (usuario.estado !== 'activo') throw cuentaBloqueada(usuario.motivoBloqueo)

    const actualizado = usuariosRepository.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null, ultimoAccesoEn: new Date(ahora).toISOString() })
    sessionRepository.save(
      { usuarioId: usuario.id, iniciadaEn: new Date(ahora).toISOString() },
      { recordar: recordar === true },
    )
    return { usuario: sanitizeUsuario(actualizado) }
  })
}

export function cerrarSesion() {
  return simulateRequest(() => {
    sessionRepository.clear()
  })
}

export function obtenerSesion() {
  return simulateRequest(() => {
    const sesion = sessionRepository.read()
    if (!sesion) return null
    const usuario = usuariosRepository.findById(sesion.usuarioId)
    if (usuario?.estado !== 'activo') {
      sessionRepository.clear()
      return null
    }
    return { usuario: sanitizeUsuario(usuario) }
  })
}

// chequeo local, sin simular petición
export function haySesionGuardada() {
  return sessionRepository.read() !== null
}

// solo vale el último enlace; los anteriores sin usar se borran
function crearEnlaceDeRecuperacion(usuarioId) {
  const creadoEn = Date.now()
  const enlace = tokensRecuperacionRepository.insert({
    id: nextId('rec', tokensRecuperacionRepository.findAll()),
    token: `REC-${randomHex(16).toUpperCase()}`,
    usuarioId,
    creadoEn: new Date(creadoEn).toISOString(),
    venceEn: new Date(creadoEn + VIGENCIA_ENLACE_MS).toISOString(),
    usadoEn: null,
  })
  for (const anterior of tokensRecuperacionRepository.findAll({ usuarioId, usadoEn: null })) {
    if (anterior.id !== enlace.id) tokensRecuperacionRepository.remove(anterior.id)
  }
  return enlace
}

// Responde igual exista o no la cuenta. tokenDemo es solo para la bandeja simulada.
export function solicitarRecuperacion(correo) {
  return simulateRequest(() => {
    const fieldErrors = validateRecuperacion({ correo })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const respuesta = { enviado: true, correo: normalizeCorreo(correo) }
    const usuario = usuariosRepository.findByCorreo(respuesta.correo)
    return usuario ? { ...respuesta, tokenDemo: crearEnlaceDeRecuperacion(usuario.id).token } : respuesta
  })
}

function buscarEnlaceVigente(token) {
  const enlace = tokensRecuperacionRepository.findByToken(token)
  const usuario = enlace && usuariosRepository.findById(enlace.usuarioId)
  if (!usuario) {
    throw new ServiceError(404, 'RESET_TOKEN_NOT_FOUND', 'Este enlace para restablecer la contraseña no es válido.')
  }
  if (enlace.usadoEn) {
    throw new ServiceError(410, 'RESET_TOKEN_USED', 'Este enlace ya se usó: cada enlace sirve una sola vez.')
  }
  if (Date.parse(enlace.venceEn) <= Date.now()) {
    throw new ServiceError(410, 'RESET_TOKEN_EXPIRED', 'Este enlace venció: es válido por 30 minutos.')
  }
  return { enlace, usuario }
}

export function validarTokenRecuperacion(token) {
  return simulateRequest(() => ({ correo: buscarEnlaceVigente(token).usuario.correo }))
}

// También quita el bloqueo por intentos, pero no el que puso un supervisor.
export function restablecerPassword(token, password, confirmacion) {
  return simulateRequest(async () => {
    buscarEnlaceVigente(token)
    const fieldErrors = validateRestablecimiento({ password, confirmacion })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const credenciales = await createPasswordCredentials(password)
    // se vuelve a leer el enlace después del hash
    const { enlace, usuario } = buscarEnlaceVigente(token)
    const ahora = new Date().toISOString()
    usuariosRepository.update(usuario.id, {
      ...credenciales,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      actualizadoEn: ahora,
    })
    tokensRecuperacionRepository.update(enlace.id, { usadoEn: ahora })
    return { correo: usuario.correo }
  })
}

function cuentaActiva(usuarioId) {
  const usuario = usuariosRepository.findById(usuarioId)
  if (usuario?.estado !== 'activo') {
    throw new ServiceError(401, 'UNAUTHENTICATED', 'Inicia sesión para cambiar tu contraseña.')
  }
  return usuario
}

// si la contraseña actual no coincide, sale como error del campo "actual"
export function cambiarPassword(usuarioId, datos) {
  return simulateRequest(async () => {
    const cuenta = cuentaActiva(usuarioId)
    const { actual, nueva, confirmacion } = datos ?? {}
    const fieldErrors = validateCambioPassword({ actual, nueva, confirmacion })
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    if (!(await verifyPassword(actual, cuenta.passwordSalt, cuenta.passwordHash))) {
      throw validationError({ actual: VALIDATION_MESSAGES.passwordActualIncorrect })
    }
    const credenciales = await createPasswordCredentials(nueva)
    // igual que arriba, se relee la cuenta después de los hash
    const actualizado = usuariosRepository.update(cuentaActiva(usuarioId).id, {
      ...credenciales,
      actualizadoEn: new Date().toISOString(),
    })
    return sanitizeUsuario(actualizado)
  })
}
