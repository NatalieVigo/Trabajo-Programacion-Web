import { intentosAccesoRepository } from '../repositories/intentosAcceso.repository.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatTime } from '../utils/format.js'
import { nextId } from '../utils/ids.js'
import { verifyPassword } from '../utils/password.js'
import { hasErrors, normalizeCorreo, validateLogin } from '../utils/validators.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { sanitizeUsuario } from './usuarios.service.js'

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15
const BLOQUEO_MS = BLOQUEO_MINUTOS * 60 * 1000
const CORREO_SOPORTE = 'soporte.campus@ulima.edu.pe'

// Con un correo sin cuenta también se calcula un hash (con una sal de relleno): el tiempo de respuesta no lo delata.
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

/** Suma un intento fallido; el quinto bloquea 15 minutos. Tras un bloqueo ya vencido se vuelve a contar desde cero. */
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

/**
 * Los intentos con un correo sin cuenta se guardan, cuentan y bloquean igual que los de una cuenta real (también
 * tras recargar la aplicación) para que la respuesta no revele qué correos están registrados.
 */
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

/**
 * Inicio de sesión (HU-1 · 1.3). Devuelve { usuario } sin credenciales y guarda la sesión: en este equipo si
 * `recordar`, si no solo en la pestaña. Cinco intentos fallidos seguidos bloquean la cuenta 15 minutos y un ingreso
 * correcto reinicia el contador. Falla con 400 VALIDATION_ERROR, 401 INVALID_CREDENTIALS (details.intentosRestantes;
 * también si el correo no tiene cuenta, sin revelarlo), 423 ACCOUNT_LOCKED (details.bloqueadoHasta) o
 * 403 ACCOUNT_BLOCKED (details.motivo), este último solo con la contraseña correcta.
 */
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
    // Tras el hash ya no media ningún await: el contador se actualiza sobre una lectura fresca de la cuenta.
    const ahora = Date.now()
    const usuario = cuenta && usuariosRepository.findById(cuenta.id)
    if (!usuario) throw registrarFalloSinCuenta(normalizeCorreo(correo), ahora)
    if (bloqueoVigente(usuario, ahora)) throw cuentaBloqueadaTemporalmente(usuario.bloqueadoHasta)
    if (!passwordCorrecta) throw registrarFallo(usuario, ahora)
    if (usuario.estado !== 'activo') throw cuentaBloqueada(usuario.motivoBloqueo)

    const actualizado = usuariosRepository.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null })
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

/**
 * Restaura la sesión guardada en este navegador: { usuario } o null si no hay sesión válida. Una sesión cuya cuenta
 * ya no existe o fue bloqueada por el supervisor se descarta.
 */
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

/** Comprobación local, sin petición: si este navegador guardó una sesión que valga la pena restaurar con obtenerSesion(). */
export function haySesionGuardada() {
  return sessionRepository.read() !== null
}
