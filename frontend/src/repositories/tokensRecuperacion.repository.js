import { createRepository } from './createRepository.js'

const repository = createRepository('tokensRecuperacion')

/** Enlaces de recuperación de contraseña: { id, token, usuarioId, creadoEn, venceEn, usadoEn }. */
export const tokensRecuperacionRepository = {
  ...repository,
  findByToken(token) {
    return repository.findOne((enlace) => enlace.token === token)
  },
}
