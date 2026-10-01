import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Stepper from './Stepper.jsx'

const PASOS = ['Tu correo', 'Enlace enviado', 'Nueva contraseña']

const pasos = (nombre = 'Pasos') => within(screen.getByRole('list', { name: nombre })).getAllByRole('listitem')

describe('Stepper', () => {
  it('es una lista ordenada con nombre que marca el paso actual con aria-current="step"', () => {
    render(<Stepper steps={PASOS} current={1} label="Pasos para recuperar tu contraseña" />)

    const items = pasos('Pasos para recuperar tu contraseña')
    expect(screen.getByRole('list').tagName).toBe('OL')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAttribute('aria-current', 'step')
    expect(within(items[0]).getByText('Tu correo')).toBeInTheDocument()
    expect(items[1]).not.toHaveAttribute('aria-current')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('anuncia como completados los pasos anteriores al actual', () => {
    render(<Stepper steps={PASOS} current={3} />)

    const items = pasos()
    expect(items[0]).toHaveTextContent('Tu correo (completado)')
    expect(items[1]).toHaveTextContent('Enlace enviado (completado)')
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[2]).not.toHaveTextContent('completado')
    expect(screen.getByRole('listitem', { current: 'step' })).toBe(items[2])
  })
})
