// Error con status HTTP; el manejador de errores lo responde como JSON.
export class ServiceError extends Error {
  constructor(status, code, message, fieldErrors = null, { details = null } = {}) {
    super(message)
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

export function noAutenticado(mensaje = 'Inicia sesión para continuar.') {
  return new ServiceError(401, 'UNAUTHENTICATED', mensaje)
}
