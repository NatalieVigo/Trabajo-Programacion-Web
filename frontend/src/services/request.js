import { ServiceError } from './ServiceError.js'

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Simula la API con latencia y devuelve una copia, como si viajara serializado.
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
