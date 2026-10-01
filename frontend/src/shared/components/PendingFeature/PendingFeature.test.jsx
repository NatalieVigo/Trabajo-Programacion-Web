import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PendingFeature from './PendingFeature.jsx'

describe('PendingFeature', () => {
  it('indica la historia que implementa la sección y quién la desarrolla', () => {
    render(<PendingFeature historia="HU-3" nombre="Registro de tickets" action={<a href="/usuario">Ir a Inicio</a>} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Sección en construcción' })).toBeInTheDocument()
    expect(
      screen.getByText('Esta sección corresponde a la HU-3 (Registro de tickets) y la implementa otro integrante del equipo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Inicio' })).toBeInTheDocument()
  })
})
