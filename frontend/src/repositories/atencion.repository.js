import { createRepository } from './createRepository.js'

// Entidades de HU-5 (atención y cierre). Las demás historias solo las leen.
export const bitacoraRepository = createRepository('bitacora')
export const historialRepository = createRepository('historial')

// Del ticket (HU-3), HU-5 solo cambia el estado y la fecha de cierre, que queda en null mientras no esté cerrado.
const tickets = createRepository('tickets')

export const estadoDeTicketRepository = {
  guardar: (ticketId, { estado, cerradoEn = null }) => tickets.update(ticketId, { estado, cerradoEn }),
}
