import { describe, expect, it } from 'vitest'
import { ESTADOS, TRANSICIONES, esTransicionValida, sePuedeCerrar, transicionesDesde } from './estadosTicket.js'
import { ESTADO_LABELS } from './format.js'

describe('estadosTicket', () => {
  it('define los cambios de cada estado, y todos llevan a estados que existen', () => {
    expect(Object.keys(TRANSICIONES).sort()).toEqual([...ESTADOS].sort())
    expect(Object.keys(ESTADO_LABELS).sort()).toEqual([...ESTADOS].sort())
    for (const destinos of Object.values(TRANSICIONES)) {
      destinos.forEach((destino) => expect(ESTADOS).toContain(destino))
    }
  })

  it.each([
    ['abierto', ['en_atencion']],
    ['reabierto', ['en_atencion']],
    ['en_atencion', ['en_espera', 'resuelto']],
    ['en_espera', ['en_atencion', 'resuelto']],
    ['resuelto', ['en_atencion']],
    ['cerrado', []],
    ['cancelado', []],
  ])('desde %s se pasa a %j', (estado, destinos) => {
    expect(transicionesDesde(estado)).toEqual(destinos)
  })

  it('ningún cambio de estado cierra el ticket, lo devuelve a la cola ni lo deja como está', () => {
    for (const estado of ESTADOS) {
      expect(esTransicionValida(estado, 'cerrado')).toBe(false)
      expect(esTransicionValida(estado, 'abierto')).toBe(false)
      expect(esTransicionValida(estado, 'reabierto')).toBe(false)
      expect(esTransicionValida(estado, estado)).toBe(false)
    }
  })

  it('un estado desconocido no admite cambios', () => {
    expect(transicionesDesde('archivado')).toEqual([])
    expect(transicionesDesde('constructor')).toEqual([])
    expect(esTransicionValida(undefined, 'en_atencion')).toBe(false)
  })

  it('solo se cierra un ticket que se está atendiendo o que ya está resuelto', () => {
    expect(ESTADOS.filter(sePuedeCerrar)).toEqual(['en_atencion', 'resuelto'])
    expect(sePuedeCerrar(undefined)).toBe(false)
  })
})
