import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/test-utils.jsx'
import Button from './Button.jsx'

describe('Button', () => {
  it('es un botón de tipo button por defecto', async () => {
    const onClick = vi.fn()
    const { user } = renderWithProviders(<Button onClick={onClick}>Guardar cambios</Button>)

    const button = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(button).toHaveAttribute('type', 'button')
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('en carga queda deshabilitado y muestra el texto de carga', () => {
    renderWithProviders(
      <Button type="submit" loading loadingText="Ingresando…">
        Ingresar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Ingresando…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('con `to` navega como enlace de React Router', () => {
    renderWithProviders(
      <Button to="/registro" variant="secondary">
        Registrarme
      </Button>,
    )

    expect(screen.getByRole('link', { name: 'Registrarme' })).toHaveAttribute('href', '/registro')
  })

  it('un enlace deshabilitado no navega', async () => {
    const { user } = renderWithProviders(
      <Button to="/recuperar-contrasena" disabled>
        ¿Olvidaste tu contraseña?
      </Button>,
    )

    const link = screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    await user.click(link)
    expect(link).toBeInTheDocument()
  })
})
