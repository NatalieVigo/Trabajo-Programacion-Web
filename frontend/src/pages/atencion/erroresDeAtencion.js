/** Respuestas del servicio que significan que el ticket cambió mientras se trabajaba en él. */
const TICKET_DESACTUALIZADO = [403, 404, 409]

/** Si tras este error hay que volver a cargar el ticket: ya no existe, se reasignó, se cerró o pasó a otro estado. */
export function esTicketDesactualizado(error) {
  return TICKET_DESACTUALIZADO.includes(error.status)
}
