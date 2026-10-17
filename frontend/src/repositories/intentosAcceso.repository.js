import { createRepository } from './createRepository.js'

const repository = createRepository('intentosAcceso')

// intentos fallidos con correos sin cuenta, un registro por correo
export const intentosAccesoRepository = {
  ...repository,
  findByCorreo(correo) {
    return repository.findOne({ correo })
  },
}
