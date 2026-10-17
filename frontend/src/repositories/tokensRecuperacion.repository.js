import { createRepository } from './createRepository.js'

const repository = createRepository('tokensRecuperacion')

export const tokensRecuperacionRepository = {
  ...repository,
  findByToken(token) {
    return repository.findOne((enlace) => enlace.token === token)
  },
}
