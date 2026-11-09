import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// el JWT solo lleva el id de la sesión; la sesión vive en la tabla sesiones
export function firmarToken(sesionId, venceEn) {
  return jwt.sign({ sid: sesionId, exp: Math.floor(venceEn.getTime() / 1000) }, config.jwtSecret)
}

// devuelve el id de la sesión, o null si el token es falso o venció
export function leerToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret).sid ?? null
  } catch {
    return null
  }
}

// texto aleatorio para sesiones, enlaces de recuperación e invitaciones
export function textoAleatorio(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}
