import { sessionRepository } from '../repositories/session.repository.js'
import { apiRequest } from './api.js'
import { errorInesperado } from './ServiceError.js'

// si el navegador no deja guardar o borrar la sesión, sale el mensaje genérico
function enElNavegador(operacion) {
  try {
    return operacion()
  } catch (error) {
    throw errorInesperado(error)
  }
}

// Login (HU-1). La API valida las credenciales; aquí se guarda el token según "Recordarme".
export async function iniciarSesion(credenciales) {
  const { correo, password, recordar = false } = credenciales ?? {}
  const { token, usuario } = await apiRequest('/auth/login', { method: 'POST', body: { correo, password, recordar } })
  enElNavegador(() =>
    sessionRepository.save(
      { usuarioId: usuario.id, iniciadaEn: new Date().toISOString(), token },
      { recordar: recordar === true },
    ),
  )
  return { usuario }
}

// si la API no responde, la sesión igual se cierra en este navegador
export async function cerrarSesion() {
  await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
  enElNavegador(() => sessionRepository.clear())
}

// La API responde 401 si la sesión venció, se cerró o bloquearon la cuenta: entonces se borra.
export async function obtenerSesion() {
  if (!sessionRepository.read()) return null
  try {
    return { usuario: await apiRequest('/cuenta') }
  } catch (error) {
    if (error.status !== 401) throw error
    sessionRepository.clear()
    return null
  }
}

// chequeo local, sin llamar a la API
export function haySesionGuardada() {
  return sessionRepository.read() !== null
}

// Responde igual exista o no la cuenta. tokenDemo solo llega si la API simula los correos.
export function solicitarRecuperacion(correo) {
  return apiRequest('/auth/recuperar-contrasena', { method: 'POST', body: { correo } })
}

const rutaDelEnlace = (token) => `/auth/restablecer-contrasena/${encodeURIComponent(token)}`

export function validarTokenRecuperacion(token) {
  return apiRequest(rutaDelEnlace(token))
}

export function restablecerPassword(token, password, confirmacion) {
  return apiRequest(rutaDelEnlace(token), { method: 'POST', body: { password, confirmacion } })
}

// la cuenta sale del token; si la actual no coincide, el error viene en el campo "actual"
export function cambiarPassword(datos) {
  return apiRequest('/cuenta/contrasena', { method: 'PUT', body: datos })
}
