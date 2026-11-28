import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { ServiceError, errorInesperado } from '../../services/ServiceError.js'
import * as administracionUsuarios from './administracionUsuarios.js'
import * as atencion from './atencion.js'
import * as auth from './auth.js'
import * as categorias from './categorias.js'
import * as cola from './cola.js'
import * as encuestas from './encuestas.js'
import * as habilitaciones from './habilitaciones.js'
import * as invitaciones from './invitaciones.js'
import * as metricas from './metricas.js'
import * as solicitudesAcceso from './solicitudesAcceso.js'
import { ambientesRepository, categoriasRepository, subcategoriasRepository } from '../../repositories/catalogo.repository.js'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import * as tickets from '../../services/tickets.service.js'
import * as ubicaciones from './ubicaciones.js'
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
const ID = '([^/]+)'
// como permitirRoles('supervisor') del backend
const SUPERVISOR = { sesion: true, roles: ['supervisor'] }
const TECNICO = { sesion: true, roles: ['tecnico'] }

function incluirCatalogos(ticket) {
  const categoria = categoriasRepository.findById(ticket.categoriaId)
  const subcategoria = subcategoriasRepository.findById(ticket.subcategoriaId)
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  return {
    ...ticket,
    categoria: categoria && { id: categoria.id, nombre: categoria.nombre },
    subcategoria: subcategoria && { id: subcategoria.id, nombre: subcategoria.nombre },
    ambiente: ambiente && { id: ambiente.id, codigo: ambiente.codigo, nombre: ambiente.nombre },
  }
}

// las mismas rutas de HU-1 a HU-7 que src/routes del repositorio del backend
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
  // HU-2: /disponibles va antes de /categorias/:id
  ['GET', '/categorias/disponibles', () => categorias.listarDisponibles(), { sesion: true }],
  ['GET', '/categorias', () => categorias.listar(), SUPERVISOR],
  ['POST', '/categorias', ({ body }) => categorias.crear(body), { ...SUPERVISOR, status: 201 }],
  ['GET', `/categorias/${ID}`, ({ params }) => categorias.obtener(params[0]), SUPERVISOR],
  ['PATCH', `/categorias/${ID}`, ({ params, body }) => categorias.actualizar(params[0], body), SUPERVISOR],
  ['PATCH', `/categorias/${ID}/estado`, ({ params, body }) => categorias.cambiarEstado(params[0], body), SUPERVISOR],
  ['DELETE', `/categorias/${ID}`, ({ params }) => categorias.eliminar(params[0]), SUPERVISOR],
  ['GET', '/sedes', () => ubicaciones.listarSedes(), SUPERVISOR],
  ['POST', '/sedes', ({ body }) => ubicaciones.crearSede(body), { ...SUPERVISOR, status: 201 }],
  ['PATCH', `/sedes/${ID}`, ({ params, body }) => ubicaciones.actualizarSede(params[0], body), SUPERVISOR],
  ['DELETE', `/sedes/${ID}`, ({ params }) => ubicaciones.eliminarSede(params[0]), SUPERVISOR],
  ['POST', '/pabellones', ({ body }) => ubicaciones.crearPabellon(body), { ...SUPERVISOR, status: 201 }],
  ['PATCH', `/pabellones/${ID}`, ({ params, body }) => ubicaciones.actualizarPabellon(params[0], body), SUPERVISOR],
  ['DELETE', `/pabellones/${ID}`, ({ params }) => ubicaciones.eliminarPabellon(params[0]), SUPERVISOR],
  ['GET', '/ambientes', () => ubicaciones.listarAmbientes(), { sesion: true }],
  ['POST', '/ambientes', ({ body }) => ubicaciones.crearAmbiente(body), { ...SUPERVISOR, status: 201 }],
  ['PATCH', `/ambientes/${ID}`, ({ params, body }) => ubicaciones.actualizarAmbiente(params[0], body), SUPERVISOR],
  ['DELETE', `/ambientes/${ID}`, ({ params }) => ubicaciones.eliminarAmbiente(params[0]), SUPERVISOR],
  ['GET', '/tickets/duplicados', ({ query, cuenta }) => tickets.buscarTicketEnCurso({
    categoriaId: query.get('categoriaId'),
    ambienteId: query.get('ambienteId'),
  }, cuenta.id), { sesion: true }],
  ['GET', '/tickets', ({ cuenta }) => ticketsRepository.findAll({ usuarioId: cuenta.id }).map(incluirCatalogos), { sesion: true }],
  ['POST', '/tickets', async ({ body, cuenta }) => incluirCatalogos(await tickets.crearTicket(body, cuenta.id)),
    { sesion: true, status: 201 }],
  ['PATCH', `/tickets/${ID}/cancelacion`, async ({ params, cuenta }) =>
    incluirCatalogos(await tickets.cancelarTicket(params[0], cuenta.id)), { sesion: true }],
  ['PATCH', `/tickets/${ID}/reapertura`, async ({ params, body, cuenta }) =>
    incluirCatalogos(await tickets.reabrirTicket(params[0], body?.motivo, cuenta.id)), { sesion: true }],
  ['GET', '/habilitaciones', () => habilitaciones.obtenerMatriz(), SUPERVISOR],
  ['PUT', '/habilitaciones', ({ body }) => habilitaciones.guardarMatriz(body), SUPERVISOR],
  // HU-4
  ['GET', '/cola', ({ cuenta }) => cola.listarCola(cuenta.id), SUPERVISOR],
  ['GET', '/cola/bandeja', ({ cuenta }) => cola.listarBandeja(cuenta.id), TECNICO],
  ['POST', '/cola/asignaciones', async ({ cuenta, body }) =>
    ({ actualizados: await cola.asignarTickets(body?.ids, body?.tecnicoId, body?.nota ?? '', cuenta.id) }), SUPERVISOR],
  ['PATCH', '/cola/prioridad', async ({ cuenta, body }) =>
    ({ actualizados: await cola.cambiarPrioridadTickets(body?.ids, body?.prioridad, body?.motivo, cuenta.id) }), SUPERVISOR],
  ['POST', '/cola/devoluciones', async ({ cuenta, body }) =>
    ({ actualizados: await cola.devolverTickets(body?.ids, cuenta.id) }), SUPERVISOR],
  ['POST', `/cola/${ID}/autoasignacion`, async ({ cuenta, params }) =>
    ({ id: await cola.autoasignarTicket(params[0], cuenta.id) }), TECNICO],
  // HU-5: quién puede ver o cambiar cada ticket lo revisa atencion.js, como el servicio del backend
  ['GET', '/atencion', ({ cuenta }) => atencion.listarAtendidos(cuenta), { sesion: true, roles: ['tecnico'] }],
  ['GET', `/atencion/${ID}`, ({ params, cuenta }) => atencion.obtenerAtencion(params[0], cuenta), { sesion: true }],
  ['GET', `/atencion/${ID}/historial`, ({ params, cuenta }) => atencion.obtenerHistorial(params[0], cuenta),
    { sesion: true }],
  ['POST', `/atencion/${ID}/bitacora`, ({ params, body, cuenta }) => atencion.agregarEntrada(params[0], body, cuenta),
    { sesion: true, status: 201 }],
  ['PATCH', `/atencion/${ID}/estado`, ({ params, body, cuenta }) => atencion.cambiarEstado(params[0], body, cuenta),
    { sesion: true }],
  ['PATCH', `/atencion/${ID}/cierre`, ({ params, body, cuenta }) => atencion.cerrarTicket(params[0], body, cuenta),
    { sesion: true }],
  // HU-6: /satisfaccion va antes de /encuestas/:codigo
  ['GET', '/encuestas', ({ cuenta }) => encuestas.listarMisEncuestas(cuenta), { sesion: true }],
  ['GET', '/encuestas/satisfaccion', ({ query }) => encuestas.reporteSatisfaccion({
    desde: query.get('desde'),
    hasta: query.get('hasta'),
    puntaje: query.get('puntaje') ?? undefined,
  }), SUPERVISOR],
  ['GET', `/encuestas/${ID}`, ({ params, cuenta }) => encuestas.obtenerEncuesta(params[0], cuenta), { sesion: true }],
  ['PUT', `/encuestas/${ID}`, ({ params, body, cuenta }) => encuestas.responderEncuesta(params[0], body ?? {}, cuenta),
    { sesion: true }],
  // HU-7: el rango llega en la query, como ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
  ['GET', '/metricas/tablero', ({ query, cuenta }) =>
    metricas.obtenerTablero(cuenta.id, { desde: query.get('desde'), hasta: query.get('hasta') }), SUPERVISOR],
  ['GET', '/metricas/carga-tecnicos', ({ query, cuenta }) =>
    metricas.obtenerCargaTecnicos(cuenta.id, { desde: query.get('desde'), hasta: query.get('hasta') }), SUPERVISOR],
  ['GET', '/usuarios', ({ cuenta }) => administracionUsuarios.listarCuentas(cuenta.id), SUPERVISOR],
  ['GET', `/usuarios/${ID}`, ({ params, cuenta }) => administracionUsuarios.obtenerFichaCuenta(params[0], cuenta.id),
    SUPERVISOR],
  ['PATCH', `/usuarios/${ID}/bloqueo`, ({ params, body, cuenta }) =>
    administracionUsuarios.bloquearCuenta(params[0], body ?? {}, cuenta.id), SUPERVISOR],
  ['PATCH', `/usuarios/${ID}/desbloqueo`, ({ params, cuenta }) =>
    administracionUsuarios.desbloquearCuenta(params[0], cuenta.id), SUPERVISOR],
].map(([metodo, ruta, atender, { sesion = false, roles = null, status = 200 } = {}]) => ({
  metodo,
  patron: new RegExp(`^${ruta}$`),
  atender,
  sesion,
  roles,
  status,
}))

function responder(status, datos) {
  return new Response(datos === null ? null : JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Reemplaza a fetch en las pruebas del frontend: responde las rutas de HU-1 a HU-7 como la API, sobre los datos
// del navegador.
export async function fetchSimulado(url, { method = 'GET', headers, body } = {}) {
  const { pathname, searchParams } = new URL(url)
  const ruta = pathname.replace(/^\/api/, '')
  try {
    for (const { metodo, patron, atender, sesion, roles, status } of RUTAS) {
      const coincide = method === metodo && patron.exec(ruta)
      if (!coincide) continue
      const cuenta = sesion ? cuentaDelToken(headers) : null
      if (roles && !roles.includes(cuenta.rol)) {
        throw new ServiceError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para realizar esta acción.')
      }
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
