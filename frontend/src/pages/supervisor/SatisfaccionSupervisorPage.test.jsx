import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDb } from '../../repositories/db.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

describe('SatisfaccionSupervisorPage (Vista 6.3)', () => {
  beforeEach(() => {
    resetDb()
    // el periodo inicial son los 30 días hasta hoy: del 04/08 al 02/09, con las 7 encuestas del seed
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-09-02T15:00:00.000Z')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra la tabla consolidada de satisfacción y la barra lateral de comentarios', async () => {
    renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 1, name: 'Satisfacción por técnico y categoría' })).toBeInTheDocument()
    expect(await screen.findByText('7 encuestas respondidas · tasa de respuesta 100 % · promedio general 4.3 de 5')).toBeInTheDocument()
    expect(screen.getByText('Comentarios recibidos')).toBeInTheDocument()
    expect(screen.getByText('TÉCNICO')).toBeInTheDocument()
    expect(screen.getByText('CATEGORÍA PRINCIPAL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
    expect(screen.getByText('Periodo: 04/08/2026 - 02/09/2026')).toBeInTheDocument()

    const porTecnico = screen.getByRole('table', { name: 'Satisfacción por técnico' })
    const julio = within(porTecnico).getByRole('row', { name: /Julio Paredes Soto/ })
    expect(within(julio).getAllByRole('cell').map((celda) => celda.textContent)).toEqual([
      'Julio Paredes Soto',
      'Audiovisuales',
      '4.8',
      '4.8',
      '4.8',
      '4.8',
      '4',
    ])
    const porCategoria = screen.getByRole('table', { name: 'Satisfacción por categoría' })
    expect(within(porCategoria).getByRole('row', { name: /Climatización/ })).toHaveTextContent('Climatización3.02.04.03.01')
    expect(
      screen.getByText('Climatización es la categoría con menor promedio (3.0). Rapidez es el aspecto peor calificado del área.'),
    ).toBeInTheDocument()
  })

  it('permite filtrar comentarios por puntaje', async () => {
    const { user } = renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 1, name: 'Satisfacción por técnico y categoría' })).toBeInTheDocument()
    expect(await screen.findAllByText(/^«/)).toHaveLength(5)

    const selectFiltro = screen.getByLabelText(/Filtrar por puntaje:/i)
    await user.selectOptions(selectFiltro, '1_3')

    expect(selectFiltro.value).toBe('1_3')
    expect(
      await screen.findByText('«El aire recién funcionó al día siguiente. Nadie avisó que faltaba un repuesto.»'),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/^«/)).toHaveLength(1)
  })

  it('se acota por periodo; con una sola categoría la nota solo indica el aspecto peor calificado', async () => {
    const { user } = renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })
    expect(await screen.findByText(/^7 encuestas respondidas/)).toBeInTheDocument()

    // el 01/09 y el 02/09 solo está la encuesta de Iván (Eléctrico): rapidez 4, trato 5 y solución 4
    await user.click(screen.getByText(/^Periodo:/))
    await user.clear(screen.getByLabelText('Desde'))
    await user.type(screen.getByLabelText('Desde'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Aplicar periodo' }))

    expect(await screen.findByText('1 encuesta respondida · tasa de respuesta 100 % · promedio general 4.0 de 5')).toBeInTheDocument()
    expect(screen.getByText('Rapidez es el aspecto peor calificado del área.')).toBeInTheDocument()
  })

  it('un periodo sin encuestas muestra las tablas vacías', async () => {
    vi.setSystemTime('2026-11-28T15:00:00.000Z')
    renderApp('/supervisor/satisfaccion', { usuario: DEMO.supervisor })

    expect(await screen.findByText('0 encuestas respondidas · tasa de respuesta 0 % · promedio general — de 5')).toBeInTheDocument()
    expect(screen.getAllByText('No hay encuestas respondidas en este periodo.')).toHaveLength(2)
    expect(screen.getByText('No hay comentarios para este filtro.')).toBeInTheDocument()
  })
})
