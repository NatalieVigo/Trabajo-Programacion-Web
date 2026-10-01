import { resetDb } from '../repositories/db.js'
import { simulateRequest } from './request.js'

/** Vuelve a cargar los datos semilla. Solo se ofrece en desarrollo, para repetir demostraciones. */
export function restablecerDatosDemo() {
  return simulateRequest(() => {
    resetDb()
  })
}
