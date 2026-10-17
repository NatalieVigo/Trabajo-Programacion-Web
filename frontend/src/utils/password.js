import { bytesToHex, randomHex } from './ids.js'
import { validatePassword } from './validators.js'

const encoder = new TextEncoder()

const STRENGTH_LABELS = ['', 'Débil', 'Media', 'Segura']
const LOWERCASE_PATTERN = /\p{Ll}/u
const SYMBOL_PATTERN = /[^\p{L}\p{N}]/u
const LONG_PASSWORD_LENGTH = 12

export function generateSalt() {
  return randomHex(16)
}

// misma fórmula que usa el seed
export async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto no está disponible: abre la aplicación desde localhost o HTTPS.')
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(salt + password))
  return bytesToHex(new Uint8Array(digest))
}

export async function verifyPassword(password, salt, expectedHash) {
  return (await hashPassword(password, salt)) === expectedHash
}

export async function createPasswordCredentials(password) {
  const passwordSalt = generateSalt()
  return { passwordHash: await hashPassword(password, passwordSalt), passwordSalt }
}

function strengthScore(password) {
  if (!password) return 0
  // si el validador la rechaza se queda en Débil
  if (validatePassword(password)) return 1
  const isRobust =
    LOWERCASE_PATTERN.test(password) && (password.length >= LONG_PASSWORD_LENGTH || SYMBOL_PATTERN.test(password))
  return isRobust ? 3 : 2
}

// score de 0 (vacía) a 3 (segura), es solo orientativo
export function passwordStrength(password) {
  const score = strengthScore(typeof password === 'string' ? password : '')
  return { score, label: STRENGTH_LABELS[score] }
}
