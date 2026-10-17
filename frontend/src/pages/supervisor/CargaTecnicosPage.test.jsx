import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

describe('HU-7.2 · carga por técnico', () => {
  it('muestra la tabla y permite navegar a la satisfacción existente', async () => {
    const { user } = renderApp('/supervisor/carga-tecnicos', { usuario: DEMO.supervisor })
    const tabla = await screen.findByRole('table', { name: 'Carga por técnico' })
    expect(within(tabla).getByRole('rowheader', { name: 'Julio Paredes Soto' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Supervisión' })).getByRole('link', { name: 'Satisfacción' }))
    expect(ubicacionActual()).toBe('/supervisor/satisfaccion')
  })
})
