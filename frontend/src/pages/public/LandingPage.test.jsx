import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/test-utils.jsx'

const seccion = (name) => screen.getByRole('region', { name })
const recuadros = () => screen.getByRole('list', { name: 'Cómo reportar' })
const recuadro = (titulo) => screen.getByRole('heading', { level: 2, name: titulo }).closest('li')

describe('LandingPage', () => {
  it('presenta el servicio con sus accesos principales', () => {
    renderApp('/')

    const hero = seccion('Reporta una falla del campus y sigue su atención en un solo lugar')
    expect(within(hero).getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(within(hero).getByRole('link', { name: 'Registrar un ticket' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(within(hero).getByRole('link', { name: 'Ver cómo reportar' })).toHaveAttribute('href', '/#como-reportar')
    expect(document.title).toBe('Inicio · Mesa de Ayuda')
  })

  it('debajo de la presentación muestra solo los cuatro recuadros de p03', () => {
    renderApp('/')

    const titulos = within(screen.getByRole('main')).getAllByRole('heading', { level: 2 })
    expect(titulos.map((titulo) => titulo.textContent)).toEqual([
      'Qué se reporta',
      'Cómo se prioriza',
      'Tiempo de atención',
      'Emergencias',
    ])
    expect(titulos.every((titulo) => recuadros().contains(titulo))).toBe(true)
    expect(screen.getByText('Crítica 2 h · alta 8 h · media 24 h · baja 72 h hábiles.')).toBeInTheDocument()
    expect(
      screen.getByText('Fugas de agua o riesgo eléctrico: llama al anexo 30111 y registra el ticket después.'),
    ).toBeInTheDocument()
  })

  it.each([
    ['/#como-reportar', recuadros],
    ['/#categorias', () => recuadro('Qué se reporta')],
    ['/#tiempos', () => recuadro('Tiempo de atención')],
  ])('%s lleva al recuadro que lo resume', (ruta, destino) => {
    renderApp(ruta)

    expect(destino()).toHaveFocus()
  })
})
