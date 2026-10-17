import { ROUTES } from './routePaths.js'

export const ROLES = Object.freeze(['usuario', 'tecnico', 'supervisor'])

// El usuario no tiene pantalla de inicio propia, así que entra directo a sus tickets.
const ROLE_HOMES = Object.freeze({
  usuario: Object.freeze({ path: ROUTES.usuarioTickets, label: 'Mis tickets', ticketsPath: ROUTES.usuarioTickets }),
  tecnico: Object.freeze({ path: ROUTES.tecnicoBandeja, label: 'Mi bandeja', ticketsPath: ROUTES.tecnicoBandeja }),
  supervisor: Object.freeze({ path: ROUTES.supervisorTablero, label: 'Tablero', ticketsPath: ROUTES.supervisorCola }),
})

export function getRoleHome(rol) {
  return ROLE_HOMES[rol]
}
