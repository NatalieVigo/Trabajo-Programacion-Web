import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/test-utils.jsx'

describe('NotFoundPage', () => {
  it('una ruta desconocida muestra el 404 dentro del layout público', () => {
    renderApp('/esta/ruta/no-existe')

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'El enlace puede haber cambiado. Si buscabas un ticket, ingresa su código en el buscador de la cabecera.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar un ticket' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(document.title).toBe('Página no encontrada · Mesa de Ayuda')
  })

  it('«Ir al inicio» vuelve a la landing', async () => {
    const { user } = renderApp('/ticket/TCK-2026-99999')

    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reporta una falla del campus y sigue su atención en un solo lugar' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
  })
})
