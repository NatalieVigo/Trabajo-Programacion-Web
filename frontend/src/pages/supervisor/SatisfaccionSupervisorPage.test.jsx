import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../repositories/db.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

describe('SatisfaccionSupervisorPage (Vista 6.3)', () => {
  beforeEach(() => {
    resetDb()
  })

  it('muestra la tabla consolidada de satisfacción y la barra lateral de comentarios', async () => {
    renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 1, name: 'Satisfacción por técnico y categoría' })).toBeInTheDocument()
    expect(screen.getByText('Comentarios recibidos')).toBeInTheDocument()
    expect(screen.getByText('TÉCNICO')).toBeInTheDocument()
    expect(screen.getByText('CATEGORÍA PRINCIPAL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })

  it('permite filtrar comentarios por puntaje', async () => {
    const { user } = renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 1, name: 'Satisfacción por técnico y categoría' })).toBeInTheDocument()

    const selectFiltro = screen.getByLabelText(/Filtrar por puntaje:/i)
    await user.selectOptions(selectFiltro, '4_5')

    expect(selectFiltro.value).toBe('4_5')
  })
})
