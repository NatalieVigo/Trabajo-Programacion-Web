import { describe, expect, it } from 'vitest'
import {
  ATENCION_MESSAGES,
  MENSAJE_MAX_LENGTH,
  normalizeTexto,
  validateEntrada,
  validateMensaje,
  validateTipoEntrada,
} from './atencionValidators.js'

describe('atencionValidators · entrada de la bitácora', () => {
  it('normaliza el texto sin tocar los saltos de línea del medio', () => {
    expect(normalizeTexto('  Cambié el cable.\nYa funciona.  \n')).toBe('Cambié el cable.\nYa funciona.')
    expect(normalizeTexto(null)).toBe('')
    expect(normalizeTexto(42)).toBe('')
  })

  it('exige un mensaje de hasta 600 caracteres', () => {
    expect(validateMensaje('Cambié el cable.')).toBeNull()
    expect(validateMensaje('a'.repeat(MENSAJE_MAX_LENGTH))).toBeNull()
    expect(validateMensaje('')).toBe(ATENCION_MESSAGES.mensajeRequired)
    expect(validateMensaje('   \n ')).toBe(ATENCION_MESSAGES.mensajeRequired)
    expect(validateMensaje(undefined)).toBe(ATENCION_MESSAGES.mensajeRequired)
    expect(validateMensaje('a'.repeat(MENSAJE_MAX_LENGTH + 1))).toBe('Usa como máximo 600 caracteres.')
  })

  it('no cuenta los espacios de los extremos para el máximo', () => {
    expect(validateMensaje(`  ${'a'.repeat(MENSAJE_MAX_LENGTH)}  `)).toBeNull()
  })

  it('solo admite comentarios públicos y notas internas', () => {
    expect(validateTipoEntrada('publico')).toBeNull()
    expect(validateTipoEntrada('interno')).toBeNull()
    expect(validateTipoEntrada('privado')).toBe(ATENCION_MESSAGES.tipoRequired)
    expect(validateTipoEntrada(undefined)).toBe(ATENCION_MESSAGES.tipoRequired)
  })

  it('devuelve solo los campos inválidos de la entrada', () => {
    expect(validateEntrada({ tipo: 'interno', mensaje: 'Pedí el repuesto.' })).toEqual({})
    expect(validateEntrada({ tipo: 'publico', mensaje: ' ' })).toEqual({ mensaje: ATENCION_MESSAGES.mensajeRequired })
    expect(validateEntrada({})).toEqual({
      tipo: ATENCION_MESSAGES.tipoRequired,
      mensaje: ATENCION_MESSAGES.mensajeRequired,
    })
  })
})
