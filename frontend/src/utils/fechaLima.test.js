import { describe, expect, it } from 'vitest'
import { esFechaDeCalendario, fechaEnLima, finDelDiaEnLima, hoyEnLima } from './fechaLima.js'
import { formatDate } from './format.js'

describe('fechaLima', () => {
  it('da el día en Lima de un instante, aunque en UTC ya sea el día siguiente', () => {
    expect(fechaEnLima('2026-10-01T15:00:00.000Z')).toBe('2026-10-01')
    expect(fechaEnLima('2026-10-02T04:59:59.000Z')).toBe('2026-10-01')
    expect(fechaEnLima('2026-10-02T05:00:00.000Z')).toBe('2026-10-02')
    expect(hoyEnLima(Date.parse('2026-12-31T23:30:00.000Z'))).toBe('2026-12-31')
  })

  it('reconoce los días que existen con el formato de un campo de fecha', () => {
    expect(esFechaDeCalendario('2026-10-05')).toBe(true)
    expect(esFechaDeCalendario('2028-02-29')).toBe(true)
    expect(esFechaDeCalendario('2026-02-30')).toBe(false)
    expect(esFechaDeCalendario('2026-13-01')).toBe(false)
    expect(esFechaDeCalendario('05/10/2026')).toBe(false)
    expect(esFechaDeCalendario('')).toBe(false)
    expect(esFechaDeCalendario(null)).toBe(false)
  })

  it('guarda un día como su último instante en Lima, que se muestra como ese mismo día', () => {
    expect(finDelDiaEnLima('2026-10-05')).toBe('2026-10-06T04:59:59.000Z')
    expect(formatDate(finDelDiaEnLima('2026-10-05'))).toBe('05/10/2026')
    expect(fechaEnLima(finDelDiaEnLima('2026-12-31'))).toBe('2026-12-31')
  })
})
