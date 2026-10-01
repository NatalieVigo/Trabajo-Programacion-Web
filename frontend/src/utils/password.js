import { bytesToHex, randomHex } from './ids.js'

const encoder = new TextEncoder()

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
