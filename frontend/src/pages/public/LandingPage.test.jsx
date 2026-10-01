import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DB_STORAGE_KEY, readTable, writeTable } from '../../repositories/db.js'
import { renderApp } from '../../test/test-utils.jsx'

afterEach(() => {
  vi.restoreAllMocks()
})

const seccion = (name) => screen.getByRole('region', { name })

async function renderLanding() {
  const view = renderApp('/')
  await within(seccion('Categorías de servicio')).findByRole('heading', { level: 3, name: 'Audiovisuales' })
  return view
}

describe('LandingPage', () => {
  it('presenta el servicio con sus accesos principales', async () => {
    await renderLanding()

    const hero = seccion('Reporta una falla del campus y sigue su atención en un solo lugar')
    expect(within(hero).getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(within(hero).getByRole('link', { name: 'Registrar un ticket' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(within(hero).getByRole('link', { name: 'Ver cómo reportar' })).toHaveAttribute('href', '/#como-reportar')
    expect(screen.getByText('Crítica 2 h · alta 8 h · media 24 h · baja 72 h hábiles.')).toBeInTheDocument()
    expect(
      screen.getByText('Fugas de agua o riesgo eléctrico: llama al anexo 30111 y registra el ticket después.'),
    ).toBeInTheDocument()
    expect(document.title).toBe('Inicio · Mesa de Ayuda')
  })

  it('explica cómo reportar en pasos numerados', async () => {
    await renderLanding()

    const pasos = within(seccion('Cómo reportar una falla')).getAllByRole('listitem')
    expect(pasos).toHaveLength(4)
    expect(pasos[1]).toHaveTextContent('Registra el ticket')
  })

  it('carga las categorías activas desde el catálogo', async () => {
    renderApp('/')
    const categorias = seccion('Categorías de servicio')
    expect(within(categorias).getByText('Cargando categorías…')).toBeInTheDocument()

    expect(await within(categorias).findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
    expect(within(categorias).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Audiovisuales',
      'Redes y conectividad',
      'Climatización',
      'Eléctrico',
      'Mobiliario',
      'Limpieza',
      'Accesos y cerraduras',
    ])
    expect(within(categorias).queryByText('Cargando categorías…')).not.toBeInTheDocument()
  })

  it('muestra un estado vacío si no hay categorías activas', async () => {
    writeTable(
      'categorias',
      readTable('categorias').map((categoria) => ({ ...categoria, activa: false })),
    )

    renderApp('/')

    expect(
      await within(seccion('Categorías de servicio')).findByRole('heading', {
        name: 'Aún no hay categorías disponibles',
      }),
    ).toBeInTheDocument()
  })

  it('informa el error y permite reintentar la carga', async () => {
    localStorage.removeItem(DB_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio disponible', 'QuotaExceededError')
    })
    const { user } = renderApp('/')
    const categorias = seccion('Categorías de servicio')

    expect(await within(categorias).findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las categorías de servicio.',
    )

    setItem.mockRestore()
    await user.click(within(categorias).getByRole('button', { name: 'Reintentar' }))

    expect(await within(categorias).findByRole('heading', { level: 3, name: 'Limpieza' })).toBeInTheDocument()
  })

  it('lista el tiempo esperado de atención por prioridad', async () => {
    await renderLanding()

    const filas = within(seccion('Tiempos de atención esperados')).getAllByRole('row').slice(1)
    expect(filas.map((fila) => [within(fila).getByRole('rowheader').textContent, fila.lastChild.textContent])).toEqual([
      ['Crítica', '2 h hábiles'],
      ['Alta', '8 h hábiles'],
      ['Media', '24 h hábiles'],
      ['Baja', '72 h hábiles'],
    ])
  })
})
