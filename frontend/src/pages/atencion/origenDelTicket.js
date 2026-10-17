import { ROUTES } from '../../routes/routePaths.js'

// desde qué lista llega cada rol al ticket
const ORIGENES = Object.freeze({
  tecnico: Object.freeze({ to: ROUTES.tecnicoBandeja, label: 'Mi bandeja' }),
  supervisor: Object.freeze({ to: ROUTES.supervisorCola, label: 'Cola de atención' }),
})

export function origenDelTicket(rol) {
  return ORIGENES[rol]
}
