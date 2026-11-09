import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { ServiceError, errorInesperado } from '../../services/ServiceError.js'
import * as auth from './auth.js'
import * as invitaciones from './invitaciones.js'
import * as solicitudesAcceso from './solicitudesAcceso.js'
import * as usuarios from './usuarios.js'

// el token de prueba lleva el id de la cuenta; la API real firma un JWT
export const tokenDePrueba = (usuarioId) => `prueba.${usuarioId}`

function cuentaDelToken(headers) {
  const token = headers?.Authorization?.replace(/^Bearer /, '') ?? ''
  const usuario = token.startsWith('prueba.') ? usuariosRepository.findById(token.slice('prueba.'.length)) : null
  if (usuario?.estado !== 'activo') throw new ServiceError(401, 'UNAUTHENTICATED', 'Tu sesión terminó. Inicia sesión otra vez.')
  return usuario
}

const TOKEN = '([^/]+)'

// las mismas rutas de HU-1 que backend/src/routes
const RUTAS = [
  ['POST', '/auth/login', async ({ body }) => {
    const { usuario } = await auth.iniciarSesion(body)
    return { token: tokenDePrueba(usuario.id), usuario }
  }],
  ['POST', '/auth/logout', () => null, { sesion: true }],
  ['POST', '/auth/registro', ({ body }) => usuarios.registrar(body), { status: 201 }],
  ['GET', '/auth/registro/opciones', () => usuarios.opcionesRegistro()],
  ['GET', '/auth/correo-disponible', ({ query }) => usuarios.correoDisponible(query.get('correo'))],
  ['POST', '/auth/recuperar-contrasena', ({ body }) => auth.solicitarRecuperacion(body?.correo)],
  ['GET', `/auth/restablecer-contrasena/${TOKEN}`, ({ params }) => auth.validarTokenRecuperacion(params[0])],
  ['POST', `/auth/restablecer-contrasena/${TOKEN}`, ({ params, body }) =>
    auth.restablecerPassword(params[0], body?.password, body?.confirmacion)],
  ['GET', '/cuenta', ({ cuenta }) => usuarios.sanitizeUsuario(cuenta), { sesion: true }],
  ['PATCH', '/cuenta', ({ cuenta, body }) => usuarios.actualizarPerfil(cuenta.id, body), { sesion: true }],
  ['GET', '/cuenta/opciones', () => usuarios.opcionesCuenta(), { sesion: true }],
  ['PUT', '/cuenta/contrasena', ({ cuenta, body }) => auth.cambiarPassword(cuenta.id, body), { sesion: true }],
  ['POST', '/invitaciones', ({ cuenta, body }) => invitaciones.crear(body, cuenta.id), { sesion: true, status: 201 }],
  ['GET', `/invitaciones/${TOKEN}`, ({ params }) => invitaciones.obtenerPorToken(params[0])],
  ['GET', `/invitaciones/${TOKEN}/opciones`, ({ params }) => invitaciones.opciones(params[0])],
  ['POST', `/invitaciones/${TOKEN}/aceptar`, ({ params, body }) => invitaciones.aceptar(params[0], body), { status: 201 }],
  ['POST', `/invitaciones/${TOKEN}/rechazar`, ({ params }) => invitaciones.rechazar(params[0])],
  ['POST', '/solicitudes-acceso', ({ cuenta, body }) => solicitudesAcceso.solicitar(cuenta.id, body?.recurso),
    { sesion: true, status: 201 }],
].map(([metodo, ruta, atender, { sesion = false, status = 200 } = {}]) => ({
  metodo,
  patron: new RegExp(`^${ruta}$`),
  atender,
  sesion,
  status,
}))

function responder(status, datos) {
  return new Response(datos === null ? null : JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Reemplaza a fetch en las pruebas del frontend: responde las rutas de HU-1 como la API, sobre los datos del navegador.
export async function fetchSimulado(url, { method = 'GET', headers, body } = {}) {
  const { pathname, searchParams } = new URL(url)
  const ruta = pathname.replace(/^\/api/, '')
  try {
    for (const { metodo, patron, atender, sesion, status } of RUTAS) {
      const coincide = method === metodo && patron.exec(ruta)
      if (!coincide) continue
      const cuenta = sesion ? cuentaDelToken(headers) : null
      const params = coincide.slice(1).map(decodeURIComponent)
      const datos = await atender({ body: body === undefined ? undefined : JSON.parse(body), query: searchParams, params, cuenta })
      return responder(datos === null ? 204 : status, datos)
    }
    throw new ServiceError(404, 'NOT_FOUND', 'No encontramos este recurso.')
  } catch (error) {
    const { status, code, message, fieldErrors, details } = error instanceof ServiceError ? error : errorInesperado(error)
    return responder(status, { code, message, fieldErrors, details })
  }
}
