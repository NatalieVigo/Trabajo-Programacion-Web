import { ServiceError } from '../utils/ServiceError.js'

export function rutaNoEncontrada(req, res, next) {
  next(new ServiceError(404, 'NOT_FOUND', 'No encontramos este recurso.'))
}

const respuesta = ({ code, message, fieldErrors = null, details = null }) => ({ code, message, fieldErrors, details })

// Todo error sale como JSON con su código HTTP (§7). Express lo reconoce por tener cuatro parámetros.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, req, res, next) {
  if (error instanceof ServiceError) return res.status(error.status).json(respuesta(error))
  // errores de express.json, como un cuerpo que no es JSON
  if (error.expose && error.status < 500) {
    const message = error.type === 'entity.parse.failed' ? 'El cuerpo de la petición no es un JSON válido.' : 'La petición no es válida.'
    return res.status(error.status).json(respuesta({ code: 'BAD_REQUEST', message }))
  }
  console.error(error)
  res.status(500).json(respuesta({ code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado. Inténtalo otra vez.' }))
}
