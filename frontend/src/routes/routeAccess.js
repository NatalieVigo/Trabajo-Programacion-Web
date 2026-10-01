import { matchPath } from 'react-router-dom'
import { ROLES } from './roleHome.js'
import { ROUTES } from './routePaths.js'

const USUARIO = Object.freeze(['usuario'])
const TECNICO = Object.freeze(['tecnico'])
const SUPERVISOR = Object.freeze(['supervisor'])

/**
 * Rutas privadas (SPEC §9) con los roles que pueden verlas y el recurso que muestran, con el que la vista 403 dice qué
 * se intentó ver: «No tienes permiso para ver la cola de atención». AppRoutes protege cada una con RequireRole y, tras
 * iniciar sesión, solo se vuelve a la página pedida si el rol puede verla.
 */
export const PRIVATE_ROUTES = Object.freeze(
  [
    { path: ROUTES.usuarioInicio, roles: USUARIO, recurso: 'el inicio del usuario' },
    { path: ROUTES.usuarioNuevoTicket, roles: USUARIO, recurso: 'el registro de tickets' },
    { path: ROUTES.usuarioTickets, roles: USUARIO, recurso: 'los tickets del usuario' },
    { path: ROUTES.usuarioEncuestaPendiente, roles: USUARIO, recurso: 'la encuesta pendiente' },
    { path: ROUTES.usuarioEncuestas, roles: USUARIO, recurso: 'las encuestas del usuario' },

    { path: ROUTES.tecnicoBandeja, roles: TECNICO, recurso: 'la bandeja del técnico' },
    { path: ROUTES.tecnicoHistorial, roles: TECNICO, recurso: 'el historial de atención' },

    { path: ROUTES.supervisorTablero, roles: SUPERVISOR, recurso: 'el tablero de métricas' },
    { path: ROUTES.supervisorCola, roles: SUPERVISOR, recurso: 'la cola de atención' },
    { path: ROUTES.supervisorCategorias, roles: SUPERVISOR, recurso: 'las categorías de servicio' },
    { path: ROUTES.supervisorAmbientes, roles: SUPERVISOR, recurso: 'las sedes y ambientes' },
    { path: ROUTES.supervisorTecnicos, roles: SUPERVISOR, recurso: 'los técnicos por categoría' },
    { path: ROUTES.supervisorUsuarios, roles: SUPERVISOR, recurso: 'la gestión de usuarios' },
    { path: ROUTES.supervisorInvitaciones, roles: SUPERVISOR, recurso: 'las invitaciones' },

    { path: ROUTES.miCuenta, roles: ROLES },
    { path: ROUTES.accesoDenegado, roles: ROLES },
  ].map((route) => Object.freeze(route)),
)

/** Si el rol puede ver `pathname`. Lo que no es una ruta privada de la tabla nunca se concede. */
export function canAccess(rol, pathname) {
  const route = PRIVATE_ROUTES.find(({ path }) => matchPath(path, pathname))
  return route?.roles.includes(rol) ?? false
}
