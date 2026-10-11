import { describe, expect, it } from 'vitest'
import {
  ATENCION_MESSAGES,
  MENSAJE_MAX_LENGTH,
  MOTIVO_MAX_LENGTH,
  SOLUCION_MAX_LENGTH,
  normalizeTexto,
  validateCambioEstado,
  validateCierre,
  validateEntrada,
  validateMensaje,
  validateMotivoEspera,
  validateRetornoEstimado,
  validateTipoEntrada,
} from './atencionValidators.js'

const HOY = '2026-10-01'

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

describe('atencionValidators · cambio de estado', () => {
  it('exige elegir un estado que exista', () => {
    expect(validateCambioEstado({ estado: 'resuelto' })).toEqual({})
    expect(validateCambioEstado({ estado: 'cerrado' })).toEqual({})
    expect(validateCambioEstado({ estado: '' })).toEqual({ estado: ATENCION_MESSAGES.estadoRequired })
    expect(validateCambioEstado({ estado: 'archivado' })).toEqual({ estado: 'Elige el nuevo estado.' })
    expect(validateCambioEstado({})).toEqual({ estado: ATENCION_MESSAGES.estadoRequired })
  })
})

describe('atencionValidators · espera', () => {
  it('exige un motivo de hasta 240 caracteres', () => {
    expect(validateMotivoEspera('Repuesto solicitado al almacén.')).toBeNull()
    expect(validateMotivoEspera('a'.repeat(MOTIVO_MAX_LENGTH))).toBeNull()
    expect(validateMotivoEspera('   ')).toBe(ATENCION_MESSAGES.motivoRequired)
    expect(validateMotivoEspera(undefined)).toBe('Indica el motivo de la espera.')
    expect(validateMotivoEspera('a'.repeat(MOTIVO_MAX_LENGTH + 1))).toBe('Usa como máximo 240 caracteres.')
  })

  it('exige una fecha de retorno que exista, de hoy en adelante', () => {
    expect(validateRetornoEstimado('2026-10-01', HOY)).toBeNull()
    expect(validateRetornoEstimado('2026-10-05', HOY)).toBeNull()
    expect(validateRetornoEstimado('2027-01-02', HOY)).toBeNull()
    expect(validateRetornoEstimado('', HOY)).toBe(ATENCION_MESSAGES.retornoRequired)
    expect(validateRetornoEstimado(null, HOY)).toBe('Indica la fecha estimada de retorno.')
    expect(validateRetornoEstimado('2026-02-30', HOY)).toBe(ATENCION_MESSAGES.retornoInvalido)
    expect(validateRetornoEstimado('05/10/2026', HOY)).toBe('Ingresa una fecha válida.')
    expect(validateRetornoEstimado('2026-09-30', HOY)).toBe(ATENCION_MESSAGES.retornoPasado)
  })

  it('sin indicar el día, compara con el de hoy en Lima', () => {
    expect(validateRetornoEstimado('2000-01-01')).toBe('La fecha de retorno no puede ser anterior a hoy.')
    expect(validateRetornoEstimado('2999-12-31')).toBeNull()
  })

  it('el motivo y la fecha solo se piden al dejar el ticket en espera', () => {
    expect(validateCambioEstado({ estado: 'en_espera', motivo: '', retornoEstimado: '' }, { hoy: HOY })).toEqual({
      motivo: ATENCION_MESSAGES.motivoRequired,
      retornoEstimado: ATENCION_MESSAGES.retornoRequired,
    })
    expect(
      validateCambioEstado({ estado: 'en_espera', motivo: 'Falta el repuesto.', retornoEstimado: '2026-10-05' }, { hoy: HOY }),
    ).toEqual({})
    expect(validateCambioEstado({ estado: 'resuelto', motivo: '', retornoEstimado: '' }, { hoy: HOY })).toEqual({})
    expect(validateCambioEstado({ estado: 'en_atencion' })).toEqual({})
  })
})

describe('atencionValidators · cierre', () => {
  it('exige describir la solución con entre 10 y 600 caracteres', () => {
    expect(validateCierre({ solucion: 'Se reemplazó el cable HDMI.' })).toEqual({})
    expect(validateCierre({ solucion: 'a'.repeat(SOLUCION_MAX_LENGTH) })).toEqual({})
    expect(validateCierre({ solucion: '  1234567890  ' })).toEqual({})
    expect(validateCierre({ solucion: '   ' })).toEqual({ solucion: ATENCION_MESSAGES.solucionRequired })
    expect(validateCierre({})).toEqual({ solucion: 'Describe la solución aplicada.' })
    expect(validateCierre({ solucion: 'Listo.' })).toEqual({ solucion: 'Describe la solución con al menos 10 caracteres.' })
    expect(validateCierre({ solucion: 'a'.repeat(SOLUCION_MAX_LENGTH + 1) })).toEqual({
      solucion: 'Usa como máximo 600 caracteres.',
    })
  })
})
