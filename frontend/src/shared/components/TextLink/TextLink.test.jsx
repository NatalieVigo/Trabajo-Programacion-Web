import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/test-utils.jsx'
import TextLink from './TextLink.jsx'

describe('TextLink', () => {
  it('es un enlace de React Router', () => {
    renderWithProviders(<TextLink to="/registro">Regístrate</TextLink>)

    const link = screen.getByRole('link', { name: 'Regístrate' })
    expect(link).toHaveAttribute('href', '/registro')
    expect(link).not.toHaveAttribute('aria-disabled')
  })

  it('deshabilitado no navega ni recibe el foco con el teclado', async () => {
    const { user } = renderWithProviders(
      <>
        <TextLink to="/registro" disabled>
          Regístrate
        </TextLink>
        <button type="button">Siguiente</button>
      </>,
    )
    const link = screen.getByRole('link', { name: 'Regístrate' })

    expect(link).toHaveAttribute('aria-disabled', 'true')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus()
    await user.click(link)
    expect(link).toBeInTheDocument()
  })
})
