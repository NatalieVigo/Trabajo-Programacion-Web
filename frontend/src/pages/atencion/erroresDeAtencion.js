// con estos errores el ticket cambió mientras se trabajaba y hay que recargarlo
const TICKET_DESACTUALIZADO = [403, 404, 409]

export function esTicketDesactualizado(error) {
  return TICKET_DESACTUALIZADO.includes(error.status)
}
