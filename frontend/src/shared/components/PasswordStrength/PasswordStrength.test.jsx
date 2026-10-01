import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PasswordStrength from './PasswordStrength.jsx'

const barrasLlenas = (container) => container.querySelectorAll('.password-strength__bar.is-filled').length

describe('PasswordStrength', () => {
  it('sin contraseña no muestra el medidor y la región de anuncios queda vacía', () => {
    const { container } = render(<PasswordStrength password="" />)

    expect(container.querySelector('.password-strength')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement()
  })

  it.each([
    ['camila', 1, 'Débil'],
    ['Camila2026', 2, 'Media'],
    ['Camila2026!', 3, 'Segura'],
  ])('«%s» llena %i de las 3 barras, muestra «%s» y lo anuncia', (password, barras, etiqueta) => {
    const { container } = render(<PasswordStrength password={password} />)

    expect(container.querySelectorAll('.password-strength__bar')).toHaveLength(3)
    expect(barrasLlenas(container)).toBe(barras)
    expect(screen.getByText(etiqueta)).toBeVisible()
    expect(screen.getByText(`Seguridad de la contraseña: ${etiqueta}`)).toHaveAttribute('aria-live', 'polite')
  })
})
