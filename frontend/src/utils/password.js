import { bytesToHex, randomHex } from './ids.js'
import { validatePassword } from './validators.js'

const encoder = new TextEncoder()

const STRENGTH_LABELS = ['', 'Débil', 'Media', 'Segura']
const LOWERCASE_PATTERN = /\p{Ll}/u
const SYMBOL_PATTERN = /[^\p{L}\p{N}]/u
const LONG_PASSWORD_LENGTH = 12

/** Sal aleatoria de 32 caracteres hexadecimales (16 bytes). */
export function generateSalt() {
  return randomHex(16)
}

/** SHA-256 en hexadecimal (minúsculas) de `salt + password`: la misma fórmula del seed. */
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

function strengthScore(password) {
  if (!password) return 0
  // Lo que el validador rechaza (regla mínima o más de 64 caracteres) nunca pasa de «Débil».
  if (validatePassword(password)) return 1
  const isRobust =
    LOWERCASE_PATTERN.test(password) && (password.length >= LONG_PASSWORD_LENGTH || SYMBOL_PATTERN.test(password))
  return isRobust ? 3 : 2
}

/**
 * Seguridad orientativa de una contraseña: score 0 (vacía), 1 «Débil» (no es válida: no cumple la regla mínima
 * o pasa de 64 caracteres), 2 «Media» (es válida) o 3 «Segura» (además combina minúsculas y tiene 12 caracteres
 * o más, o un símbolo).
 */
export function passwordStrength(password) {
  const score = strengthScore(typeof password === 'string' ? password : '')
  return { score, label: STRENGTH_LABELS[score] }
}
