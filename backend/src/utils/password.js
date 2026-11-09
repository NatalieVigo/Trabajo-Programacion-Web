import bcrypt from 'bcryptjs'

// bcrypt mezcla una sal aleatoria dentro del hash; 10 rondas es lo usual
const RONDAS = 10

export function hashPassword(password) {
  return bcrypt.hash(password, RONDAS)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}
