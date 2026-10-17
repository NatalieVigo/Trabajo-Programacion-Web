import { describe, expect, it } from 'vitest'
import { HORA_MS, MINUTO_MS } from '../utils/duracion.js'
import { etapasDe, tiempoPorEstado, tiemposDe } from './tiemposDeAtencion.js'

const estado = (nombre, creadoEn) => ({ estado: nombre, creadoEn })

// TCK-2026-00130, con 18 h 30 min en espera
const CERRADO = [
  estado('abierto', '2026-08-31T14:04:00.000Z'),
  estado('en_atencion', '2026-08-31T15:12:00.000Z'),
  estado('en_espera', '2026-08-31T21:00:00.000Z'),
  estado('resuelto', '2026-09-01T15:30:00.000Z'),
  estado('cerrado', '2026-09-01T20:16:00.000Z'),
]
const EN_CURSO = [estado('abierto', '2026-09-29T20:40:00.000Z'), estado('en_atencion', '2026-09-29T21:10:00.000Z')]
const AHORA = Date.parse('2026-10-01T15:00:00.000Z')

describe('tiemposDeAtencion · etapasDe', () => {
  it('cada estado dura hasta el cambio siguiente, y el cierre no acumula tiempo', () => {
    expect(etapasDe(CERRADO, AHORA)).toEqual([
      { estado: 'abierto', desde: '2026-08-31T14:04:00.000Z', ms: 68 * MINUTO_MS, enCurso: false },
      { estado: 'en_atencion', desde: '2026-08-31T15:12:00.000Z', ms: 5 * HORA_MS + 48 * MINUTO_MS, enCurso: false },
      { estado: 'en_espera', desde: '2026-08-31T21:00:00.000Z', ms: 18 * HORA_MS + 30 * MINUTO_MS, enCurso: false },
      { estado: 'resuelto', desde: '2026-09-01T15:30:00.000Z', ms: 4 * HORA_MS + 46 * MINUTO_MS, enCurso: false },
      { estado: 'cerrado', desde: '2026-09-01T20:16:00.000Z', ms: 0, enCurso: false },
    ])
  })

  it('el estado actual de un ticket en curso dura hasta ahora', () => {
    expect(etapasDe(EN_CURSO, AHORA)).toEqual([
      { estado: 'abierto', desde: '2026-09-29T20:40:00.000Z', ms: 30 * MINUTO_MS, enCurso: false },
      { estado: 'en_atencion', desde: '2026-09-29T21:10:00.000Z', ms: 41 * HORA_MS + 50 * MINUTO_MS, enCurso: true },
    ])
  })

  it('no da tiempos negativos si el reloj está antes del último cambio', () => {
    expect(etapasDe(EN_CURSO, Date.parse('2026-09-29T21:00:00.000Z')).at(-1).ms).toBe(0)
    expect(etapasDe([], AHORA)).toEqual([])
  })
})

describe('tiemposDeAtencion · tiemposDe', () => {
  it('el total de un ticket cerrado va del registro al cierre, y la atención no cuenta la espera', () => {
    expect(tiemposDe(CERRADO, AHORA)).toEqual({
      totalMs: 30 * HORA_MS + 12 * MINUTO_MS,
      enEsperaMs: 18 * HORA_MS + 30 * MINUTO_MS,
      atencionMs: 11 * HORA_MS + 42 * MINUTO_MS,
    })
  })

  it('el total de un ticket en curso llega hasta ahora', () => {
    expect(tiemposDe(EN_CURSO, AHORA)).toEqual({
      totalMs: 42 * HORA_MS + 20 * MINUTO_MS,
      enEsperaMs: 0,
      atencionMs: 42 * HORA_MS + 20 * MINUTO_MS,
    })
  })

  it('suma todas las esperas, también la que sigue en curso', () => {
    const conDosEsperas = [
      estado('abierto', '2026-10-01T10:00:00.000Z'),
      estado('en_atencion', '2026-10-01T11:00:00.000Z'),
      estado('en_espera', '2026-10-01T12:00:00.000Z'),
      estado('en_atencion', '2026-10-01T13:00:00.000Z'),
      estado('en_espera', '2026-10-01T14:00:00.000Z'),
    ]

    expect(tiemposDe(conDosEsperas, AHORA)).toEqual({ totalMs: 5 * HORA_MS, enEsperaMs: 2 * HORA_MS, atencionMs: 3 * HORA_MS })
  })

  it('un ticket que se reabrió no cuenta el tiempo que estuvo cerrado', () => {
    const reabierto = [
      estado('abierto', '2026-10-01T10:00:00.000Z'),
      estado('en_atencion', '2026-10-01T11:00:00.000Z'),
      estado('cerrado', '2026-10-01T12:00:00.000Z'),
      estado('reabierto', '2026-10-01T14:00:00.000Z'),
    ]

    expect(tiemposDe(reabierto, AHORA).totalMs).toBe(3 * HORA_MS)
  })
})

describe('tiemposDeAtencion · tiempoPorEstado', () => {
  it('da el tiempo en cada estado por el que pasó el ticket, sin el cierre', () => {
    expect(tiempoPorEstado(CERRADO, AHORA)).toEqual([
      { estado: 'abierto', ms: 68 * MINUTO_MS },
      { estado: 'en_atencion', ms: 5 * HORA_MS + 48 * MINUTO_MS },
      { estado: 'en_espera', ms: 18 * HORA_MS + 30 * MINUTO_MS },
      { estado: 'resuelto', ms: 4 * HORA_MS + 46 * MINUTO_MS },
    ])
    expect(tiempoPorEstado(EN_CURSO, AHORA).map(({ estado }) => estado)).toEqual(['abierto', 'en_atencion'])
  })

  it('suma las veces que el ticket volvió al mismo estado', () => {
    const conVueltas = [
      estado('abierto', '2026-10-01T10:00:00.000Z'),
      estado('en_atencion', '2026-10-01T11:00:00.000Z'),
      estado('en_espera', '2026-10-01T12:00:00.000Z'),
      estado('en_atencion', '2026-10-01T13:00:00.000Z'),
      estado('resuelto', '2026-10-01T14:30:00.000Z'),
    ]

    expect(tiempoPorEstado(conVueltas, AHORA)).toEqual([
      { estado: 'abierto', ms: HORA_MS },
      { estado: 'en_atencion', ms: 2 * HORA_MS + 30 * MINUTO_MS },
      { estado: 'en_espera', ms: HORA_MS },
      { estado: 'resuelto', ms: 30 * MINUTO_MS },
    ])
  })
})
