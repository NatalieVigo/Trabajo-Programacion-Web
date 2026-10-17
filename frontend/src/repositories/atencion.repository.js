import { createRepository } from './createRepository.js'

// Tablas de HU-5, las otras historias solo las leen.
export const bitacoraRepository = createRepository('bitacora')
export const historialRepository = createRepository('historial')

// del ticket solo se cambia el estado y cerradoEn (null hasta que se cierre)
const tickets = createRepository('tickets')

export const estadoDeTicketRepository = {
  guardar: (ticketId, { estado, cerradoEn = null }) => tickets.update(ticketId, { estado, cerradoEn }),
}
