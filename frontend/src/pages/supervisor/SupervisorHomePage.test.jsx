import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEMO, renderApp } from '../../test/test-utils.jsx'
import { descargarFilasCsv } from '../../utils/exportarCsv.js'

vi.mock('../../utils/exportarCsv.js', () => ({ descargarFilasCsv: vi.fn() }))

describe('HU-7.1 · tablero', () => {
  it('filtra un periodo vacío y descarga sus resultados', async () => {
    const { user } = renderApp('/supervisor', { usuario: DEMO.supervisor })
    expect(await screen.findByRole('heading', { name: 'Tablero de métricas' })).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Tickets por estado' })
    await user.click(screen.getByText(/^Rango:/))
    await user.clear(screen.getByLabelText('Desde'))
    await user.type(screen.getByLabelText('Desde'), '2030-01-01')
    await user.clear(screen.getByLabelText('Hasta'))
    await user.type(screen.getByLabelText('Hasta'), '2030-01-31')
    await user.click(screen.getByRole('button', { name: 'Aplicar periodo' }))
    await screen.findByText('No hay tickets en este periodo.')
    await user.click(screen.getByRole('button', { name: 'Descargar reporte' }))
    await waitFor(() => expect(descargarFilasCsv).toHaveBeenCalledWith('metricas-2030-01-01-2030-01-31.csv', expect.arrayContaining([['Tickets del periodo', 0]])))
  })
})
