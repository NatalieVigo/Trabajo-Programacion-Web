import { createRepository } from './createRepository.js'

const repository = createRepository('intentosAcceso')

/** Intentos fallidos de inicio de sesión con correos que no tienen cuenta: uno por correo (en minúsculas). */
export const intentosAccesoRepository = {
  ...repository,
  findByCorreo(correo) {
    return repository.findOne({ correo })
  },
}
