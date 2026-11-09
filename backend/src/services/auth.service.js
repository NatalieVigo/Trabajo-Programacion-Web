import { config } from '../config.js'
import { enTransaccion } from '../db/pool.js'
import { intentosAccesoRepository } from '../repositories/intentosAcceso.repository.js'
import { sesionesRepository } from '../repositories/sesiones.repository.js'
import { tokensRecuperacionRepository } from '../repositories/tokensRecuperacion.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatTime } from '../utils/format.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { ServiceError, noAutenticado, validationError } from '../utils/ServiceError.js'
import { firmarToken, leerToken, textoAleatorio } from '../utils/tokens.js'
import {
  VALIDATION_MESSAGES,
  hasErrors,
  normalizeCorreo,
  validateCambioPassword,
  validateLogin,
  validateRecuperacion,
  validateRestablecimiento,
} from '../utils/validators.js'
import { usuarioPublico } from './usuarios.service.js'

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15
const BLOQUEO_MS = BLOQUEO_MINUTOS * 60 * 1000
const VIGENCIA_ENLACE_MS = 30 * 60 * 1000
const DURACION_SESION_MS = 8 * 60 * 60 * 1000
// "Recordarme en este equipo" (p04)
const DURACION_RECORDADA_MS = 30 * 24 * 60 * 60 * 1000
const CORREO_SOPORTE = 'soporte.campus@ulima.edu.pe'

// hash de relleno: con correos sin cuenta bcrypt tarda lo mismo y el tiempo no los delata
const HASH_SIN_CUENTA = await hashPassword('correo-sin-cuenta')

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

const bloqueoVigente = ({ bloqueadoHasta }, ahora) => Boolean(bloqueadoHasta) && new Date(bloqueadoHasta).getTime() > ahora

// el quinto fallo bloquea; después de un bloqueo vencido se cuenta desde cero
function siguienteIntento({ intentosFallidos = 0, bloqueadoHasta = null }, ahora) {
  const intentos = (bloqueadoHasta ? 0 : intentosFallidos) + 1
  return {
    intentosFallidos: intentos,
    bloqueadoHasta: intentos >= MAX_INTENTOS ? new Date(ahora + BLOQUEO_MS) : null,
  }
}

function errorDelIntento({ intentosFallidos, bloqueadoHasta }) {
  return bloqueadoHasta
    ? cuentaBloqueadaTemporalmente(bloqueadoHasta)
    : credencialesIncorrectas(MAX_INTENTOS - intentosFallidos)
}

async function registrarFallo(usuario, ahora) {
  const intento = siguienteIntento(usuario, ahora)
  await usuariosRepository.guardarIntentos(usuario.id, intento)
  return errorDelIntento(intento)
}

// los correos sin cuenta se bloquean igual, así no se revela cuáles están registrados
async function registrarFalloSinCuenta(correo, ahora) {
  const registro = await intentosAccesoRepository.buscar(correo)
  if (registro && bloqueoVigente(registro, ahora)) return cuentaBloqueadaTemporalmente(registro.bloqueadoHasta)
  const intento = siguienteIntento(registro ?? {}, ahora)
  await intentosAccesoRepository.guardar(correo, intento)
  return errorDelIntento(intento)
}

async function abrirSesion(usuarioId, recordar, ahora) {
  const id = textoAleatorio(16)
  const venceEn = new Date(ahora + (recordar ? DURACION_RECORDADA_MS : DURACION_SESION_MS))
  await sesionesRepository.crear({ id, usuarioId, creadaEn: new Date(ahora), venceEn })
  return { token: firmarToken(id, venceEn), venceEn }
}

// Login (p04 y p05). El bloqueo del supervisor solo se avisa con la contraseña correcta.
export async function iniciarSesion(credenciales) {
  const { correo, password, recordar = false } = credenciales ?? {}
  const fieldErrors = validateLogin({ correo, password })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const cuenta = await usuariosRepository.buscarPorCorreo(normalizeCorreo(correo))
  const passwordCorrecta = await verifyPassword(password, cuenta?.passwordHash ?? HASH_SIN_CUENTA)
  // se relee la cuenta después del await para no pisar otro intento
  const ahora = Date.now()
  const usuario = cuenta && (await usuariosRepository.buscarPorId(cuenta.id))
  if (!usuario) throw await registrarFalloSinCuenta(normalizeCorreo(correo), ahora)
  if (bloqueoVigente(usuario, ahora)) throw cuentaBloqueadaTemporalmente(usuario.bloqueadoHasta)
  if (!passwordCorrecta) throw await registrarFallo(usuario, ahora)
  if (usuario.estado !== 'activo') throw cuentaBloqueada(usuario.motivoBloqueo)

  await usuariosRepository.registrarAcceso(usuario.id, new Date(ahora))
  const { token, venceEn } = await abrirSesion(usuario.id, recordar === true, ahora)
  return { token, venceEn, usuario: usuarioPublico(await usuariosRepository.buscarPorId(usuario.id)) }
}

export async function cerrarSesion(sesionId) {
  await sesionesRepository.cerrar(sesionId, new Date())
}

// La usa el middleware en cada petición con sesión: si bloquean la cuenta, la sesión cae al instante.
export async function validarSesion(token) {
  const sesionId = leerToken(token)
  const sesion = sesionId && (await sesionesRepository.buscarVigente(sesionId, new Date()))
  const usuario = sesion && (await usuariosRepository.buscarPorId(sesion.usuarioId))
  if (usuario?.estado !== 'activo') throw noAutenticado('Tu sesión terminó. Inicia sesión otra vez.')
  return { sesionId, usuario: usuarioPublico(usuario) }
}

// el enlace dura 30 minutos y solo vale el último que se pidió
async function crearEnlaceDeRecuperacion(usuarioId) {
  const creadoEn = new Date()
  const token = `REC-${textoAleatorio(16).toUpperCase()}`
  await enTransaccion(async (db) => {
    await tokensRecuperacionRepository.borrarSinUsar(usuarioId, db)
    await tokensRecuperacionRepository.crear(
      { token, usuarioId, creadoEn, venceEn: new Date(creadoEn.getTime() + VIGENCIA_ENLACE_MS) },
      db,
    )
  })
  return token
}

// Paso 1 (p08). Responde igual exista o no la cuenta.
export async function solicitarRecuperacion(datos) {
  const { correo } = datos ?? {}
  const fieldErrors = validateRecuperacion({ correo })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const respuesta = { enviado: true, correo: normalizeCorreo(correo) }
  const usuario = await usuariosRepository.buscarPorCorreo(respuesta.correo)
  if (!usuario) return respuesta
  const token = await crearEnlaceDeRecuperacion(usuario.id)
  // no se envían correos reales (§4): en modo simulado el enlace va en la respuesta para la bandeja de prueba
  return config.correosSimulados ? { ...respuesta, tokenDemo: token } : respuesta
}

async function buscarEnlaceVigente(token, db, opciones) {
  const enlace = await tokensRecuperacionRepository.buscar(token, db, opciones)
  const usuario = enlace && (await usuariosRepository.buscarPorId(enlace.usuarioId, db))
  if (!usuario) {
    throw new ServiceError(404, 'RESET_TOKEN_NOT_FOUND', 'Este enlace para restablecer la contraseña no es válido.')
  }
  if (enlace.usadoEn) {
    throw new ServiceError(410, 'RESET_TOKEN_USED', 'Este enlace ya se usó: cada enlace sirve una sola vez.')
  }
  if (enlace.venceEn.getTime() <= Date.now()) {
    throw new ServiceError(410, 'RESET_TOKEN_EXPIRED', 'Este enlace venció: es válido por 30 minutos.')
  }
  return { enlace, usuario }
}

// Paso 3 (p09): antes de mostrar el formulario se revisa que el enlace sirva
export async function validarTokenRecuperacion(token) {
  const { usuario } = await buscarEnlaceVigente(token)
  return { correo: usuario.correo }
}

// También quita el bloqueo por intentos y cierra las sesiones abiertas de esa cuenta.
export async function restablecerPassword(token, datos) {
  await buscarEnlaceVigente(token)
  const { password, confirmacion } = datos ?? {}
  const fieldErrors = validateRestablecimiento({ password, confirmacion })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const passwordHash = await hashPassword(password)
  return enTransaccion(async (db) => {
    // se vuelve a leer con bloqueo para que el mismo enlace no se use dos veces
    const { usuario } = await buscarEnlaceVigente(token, db, { bloquear: true })
    const ahora = new Date()
    await usuariosRepository.restablecerPassword(usuario.id, passwordHash, ahora, db)
    await tokensRecuperacionRepository.marcarUsado(token, ahora, db)
    await sesionesRepository.cerrarTodas(usuario.id, ahora, db)
    return { correo: usuario.correo }
  })
}

// Cambiar contraseña en Mi cuenta (p10); si la actual no coincide, sale como error del campo "actual".
export async function cambiarPassword(usuarioId, datos) {
  const cuenta = await usuariosRepository.buscarPorId(usuarioId)
  const { actual, nueva, confirmacion } = datos ?? {}
  const fieldErrors = validateCambioPassword({ actual, nueva, confirmacion })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  if (!(await verifyPassword(actual, cuenta.passwordHash))) {
    throw validationError({ actual: VALIDATION_MESSAGES.passwordActualIncorrect })
  }
  await usuariosRepository.actualizarPassword(cuenta.id, await hashPassword(nueva), new Date())
  return usuarioPublico(await usuariosRepository.buscarPorId(cuenta.id))
}
