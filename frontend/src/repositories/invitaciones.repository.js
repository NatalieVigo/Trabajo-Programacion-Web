import { createRepository } from './createRepository.js'

const repository = createRepository('invitaciones')

export const invitacionesRepository = {
  ...repository,
  findByToken(token) {
    return repository.findOne((invitacion) => invitacion.token === token)
  },
}
