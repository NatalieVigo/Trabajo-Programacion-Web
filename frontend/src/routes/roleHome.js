import { ROUTES } from './routePaths.js'

export const ROLES = Object.freeze(['usuario', 'tecnico', 'supervisor'])

/**
 * Vista principal de cada rol (SPEC §9): a dónde se llega al iniciar sesión, con su nombre en el menú, y la lista de
 * tickets del rol, a la que lleva el buscador de la cabecera.
 */
const ROLE_HOMES = Object.freeze({
  usuario: Object.freeze({ path: ROUTES.usuarioInicio, label: 'Inicio', ticketsPath: ROUTES.usuarioTickets }),
  tecnico: Object.freeze({ path: ROUTES.tecnicoBandeja, label: 'Mi bandeja', ticketsPath: ROUTES.tecnicoBandeja }),
  supervisor: Object.freeze({ path: ROUTES.supervisorTablero, label: 'Tablero', ticketsPath: ROUTES.supervisorCola }),
})

export function getRoleHome(rol) {
  return ROLE_HOMES[rol]
}
