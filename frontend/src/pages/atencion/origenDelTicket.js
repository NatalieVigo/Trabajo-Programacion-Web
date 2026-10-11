import { ROUTES } from '../../routes/routePaths.js'

/** Lista desde la que cada rol llega a un ticket (HU-4): la bandeja del técnico o la cola del supervisor. */
const ORIGENES = Object.freeze({
  tecnico: Object.freeze({ to: ROUTES.tecnicoBandeja, label: 'Mi bandeja' }),
  supervisor: Object.freeze({ to: ROUTES.supervisorCola, label: 'Cola de atención' }),
})

export function origenDelTicket(rol) {
  return ORIGENES[rol]
}
