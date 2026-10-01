import { describe, expect, it } from 'vitest'
import { bytesToHex, nextId, randomHex } from './ids.js'

describe('ids', () => {
  it('calcula el siguiente id correlativo de una tabla', () => {
    const rows = [{ id: 'usr-001' }, { id: 'usr-010' }, { id: 'usr-004' }, { id: 'inv-099' }, { id: 'usr-abc' }]

    expect(nextId('usr', rows)).toBe('usr-011')
    expect(nextId('inv', rows)).toBe('inv-100')
    expect(nextId('sol', [])).toBe('sol-001')
    expect(nextId('tck', [{ id: 'tck-00147' }], 5)).toBe('tck-00148')
  })

  it('convierte bytes a hexadecimal y genera valores aleatorios', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff')
    expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/)
    expect(randomHex()).not.toBe(randomHex())
  })
})
