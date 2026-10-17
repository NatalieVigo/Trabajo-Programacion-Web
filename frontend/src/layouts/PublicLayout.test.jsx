import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../test/test-utils.jsx'

// Una ruta pública sin datos asíncronos: el layout es el mismo que el de la landing.
const RUTA_PUBLICA = '/pagina-de-prueba'

describe('PublicLayout', () => {
  it('la cabecera enlaza las secciones de la landing y el acceso', () => {
    renderApp(RUTA_PUBLICA)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Inicio', '/'],
      ['Cómo reportar', '/#como-reportar'],
      ['Categorías de servicio', '/#categorias'],
      ['Tiempos de atención', '/#tiempos'],
    ])
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(within(banner).getByRole('link', { name: 'Registrarme' })).toHaveAttribute('href', '/registro')
  })

  it('con la sesión iniciada la cabecera muestra la cuenta y lleva a la vista del rol en lugar del acceso', async () => {
    const { user } = renderApp(RUTA_PUBLICA, { usuario: DEMO.tecnico })

    const banner = await screen.findByRole('banner')
    expect(within(banner).getByText('Julio Paredes Soto')).toBeInTheDocument()
    expect(within(banner).getByText('Técnico')).toBeInTheDocument()
    expect(within(banner).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    expect(within(banner).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(banner).queryByRole('link', { name: 'Registrarme' })).not.toBeInTheDocument()
    await user.click(within(banner).getByRole('link', { name: 'Mi bandeja' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi bandeja' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico')
  })

  it('«Cerrar sesión» desde la cabecera pública vuelve a mostrar el acceso', async () => {
    const { user } = renderApp(RUTA_PUBLICA, { usuario: DEMO.usuario })

    const banner = await screen.findByRole('banner')
    await user.click(within(banner).getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument()
    expect(await within(screen.getByRole('banner')).findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('el botón «Menú» despliega y pliega la navegación', async () => {
    const { user } = renderApp(RUTA_PUBLICA)
    const toggle = screen.getByRole('button', { name: 'Menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()

    await user.click(toggle)
    await user.click(screen.getByRole('main'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    await user.click(screen.getByRole('link', { name: 'Tiempos de atención' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { level: 2, name: 'Tiempo de atención' }).closest('li')).toHaveFocus()
  })

  it('un hash mal codificado en la URL no rompe la página', () => {
    renderApp('/#%')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reporta una falla del campus y sigue su atención en un solo lugar' }),
    ).toBeInTheDocument()
  })

  it('el pie muestra los datos de contacto de la mesa de ayuda', () => {
    renderApp(RUTA_PUBLICA)

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Mesa de Ayuda de Servicios')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'soporte.campus@ulima.edu.pe' })).toHaveAttribute(
      'href',
      'mailto:soporte.campus@ulima.edu.pe',
    )
    expect(within(footer).getByText('Emergencias eléctricas · anexo 30111')).toBeInTheDocument()
    expect(within(footer).getByRole('navigation', { name: 'Reportar' })).toBeInTheDocument()
    expect(within(footer).getByRole('navigation', { name: 'Ayuda' })).toBeInTheDocument()
  })
})
