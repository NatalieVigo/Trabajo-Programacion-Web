import { createRepository } from './createRepository.js'

const repository = createRepository('usuarios')

export const usuariosRepository = {
  ...repository,
  findByCorreo(correo) {
    const normalized = String(correo ?? '').trim().toLowerCase()
    return repository.findOne((usuario) => usuario.correo === normalized)
  },
}
