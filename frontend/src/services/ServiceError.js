/**
 * Error de servicio con semántica HTTP (400, 401, 403, 404, 409, 410, 423, 500).
 * Ejemplos: `new ServiceError(400, 'VALIDATION_ERROR', 'Revisa los campos marcados.', { correo: '…' })`,
 * `new ServiceError(423, 'ACCOUNT_LOCKED', mensaje, null, { details: { bloqueadoHasta } })`.
 * En la entrega 2 se construirá a partir de la respuesta de la API REST.
 */
export class ServiceError extends Error {
  constructor(status, code, message, fieldErrors = null, { details = null, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'ServiceError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}
