import { ServiceError } from './ServiceError.js'

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Simula una llamada a la API: espera la latencia, ejecuta `operation` y devuelve una copia profunda
 * del resultado, como si viajara serializado. Un error inesperado se convierte en un 500.
 * En la entrega 2 los servicios reemplazarán esta función por fetch() a Express.
 */
export async function simulateRequest(operation) {
  if (LATENCY_MS > 0) await wait(LATENCY_MS)
  try {
    return structuredClone(await operation())
  } catch (error) {
    if (error instanceof ServiceError) throw error
    throw new ServiceError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Inténtalo otra vez.', null, {
      cause: error,
    })
  }
}
