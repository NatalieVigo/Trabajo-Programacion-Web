import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp } from '../test/test-utils.jsx'

const campo = (label) => screen.getByLabelText(label)

describe('RequireAuth', () => {
  it('sin sesión, una página privada lleva a «Iniciar sesión»', () => {
    renderApp('/supervisor/cola')

    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Cola de atención' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Supervisión' })).not.toBeInTheDocument()
  })

  it('después de ingresar vuelve a la página que se pidió, con su búsqueda', async () => {
    const { user } = renderApp('/usuario/tickets?codigo=TCK-2026-00147')

    await user.type(campo('Correo institucional'), 'camila.quispe@aloe.ulima.edu.pe')
    await user.type(campo('Contraseña'), 'Camila2026')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument()
    expect(screen.getByText('TCK-2026-00147')).toBeInTheDocument()
    expect(await screen.findByText('Mis tickets abiertos')).toBeInTheDocument()
  })

  it('con sesión muestra la página privada dentro del layout de la aplicación', async () => {
    renderApp('/tecnico/historial', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { level: 1, name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Atención' })).toBeInTheDocument()
    expect(await screen.findByText('Asignados a mí')).toBeInTheDocument()
  })
})
