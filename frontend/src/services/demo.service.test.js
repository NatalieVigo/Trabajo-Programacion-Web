import { describe, expect, it } from 'vitest'
import { readTable, writeTable } from '../repositories/db.js'
import { restablecerDatosDemo } from './demo.service.js'

describe('demo.service', () => {
  it('restablece los datos semilla', async () => {
    writeTable('usuarios', [])
    writeTable('tokensRecuperacion', [{ id: 'rec-001' }])

    await restablecerDatosDemo()

    expect(readTable('usuarios')).toHaveLength(10)
    expect(readTable('tokensRecuperacion')).toEqual([])
  })
})
