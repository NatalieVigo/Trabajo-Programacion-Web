import { describe, expect, it } from 'vitest'
import { HORA_MS, MINUTO_MS, formatDuracion } from './duracion.js'

const DIA_MS = 24 * HORA_MS

describe('duracion', () => {
  it.each([
    [46 * MINUTO_MS, '46 min'],
    [59 * MINUTO_MS + 59_999, '59 min'],
    [HORA_MS, '1 h 00 min'],
    [3 * HORA_MS + 24 * MINUTO_MS, '3 h 24 min'],
    [4 * HORA_MS + 5 * MINUTO_MS, '4 h 05 min'],
    [18 * HORA_MS + 30 * MINUTO_MS, '18 h 30 min'],
    [DIA_MS, '1 d 0 h 00 min'],
    [DIA_MS + 6 * HORA_MS + 12 * MINUTO_MS, '1 d 6 h 12 min'],
    [11 * DIA_MS + 23 * HORA_MS + 59 * MINUTO_MS, '11 d 23 h 59 min'],
  ])('%d ms se muestra como «%s»', (ms, texto) => {
    expect(formatDuracion(ms)).toBe(texto)
  })

  it('lo que no llega a un minuto, o es negativo, se muestra como menos de un minuto', () => {
    expect(formatDuracion(0)).toBe('menos de 1 min')
    expect(formatDuracion(59_999)).toBe('menos de 1 min')
    expect(formatDuracion(-5 * MINUTO_MS)).toBe('menos de 1 min')
  })
})
