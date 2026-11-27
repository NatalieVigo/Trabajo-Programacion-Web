// Error con status HTTP. Los de la API los arma api.js con la respuesta del servidor.
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

// para fallas que no traen un mensaje para mostrar
export function errorInesperado(cause) {
  return new ServiceError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Inténtalo otra vez.', null, { cause })
}
