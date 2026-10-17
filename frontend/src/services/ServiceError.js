// Error con status HTTP. En la entrega 2 se armará con la respuesta de la API.
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

// fieldErrors va como { campo: mensaje }
export function validationError(fieldErrors) {
  return new ServiceError(400, 'VALIDATION_ERROR', 'Revisa los campos marcados.', fieldErrors)
}
