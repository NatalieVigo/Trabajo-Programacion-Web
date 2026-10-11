import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'

const tabla = () => screen.getByRole('table', { name: 'Tickets a tu cargo' })
const codigos = () =>
  within(tabla())
    .getAllByRole('rowheader')
    .map((celda) => celda.textContent)
const fila = (codigo) => within(tabla()).getByRole('rowheader', { name: codigo }).closest('tr')
const buscador = () => screen.getByRole('searchbox', { name: 'Buscar por código o asunto' })
const filtroDeEstado = () => screen.getByRole('combobox', { name: 'Estado' })
const conteo = () => screen.getByText(/^Mostrando/)

/** Abre el historial de Julio y espera la tabla y el contador de la cabecera. */
async function renderHistorial() {
  const view = renderApp('/tecnico/historial', { usuario: DEMO.tecnico })
  await screen.findByRole('table', { name: 'Tickets a tu cargo' })
  await screen.findByText('Asignados a mí')
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HistorialAtencionPage', () => {
  it('lista los tickets a cargo del técnico, del de actividad más reciente al más antiguo', async () => {
    await renderHistorial()

    expect(screen.getByRole('heading', { level: 1, name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByText('8 tickets a tu cargo · 3 sin cerrar')).toBeInTheDocument()
    expect(codigos()).toEqual([
      'TCK-2026-00143',
      'TCK-2026-00144',
      'TCK-2026-00141',
      'TCK-2026-00131',
      'TCK-2026-00126',
      'TCK-2026-00118',
      'TCK-2026-00114',
      'TCK-2026-00103',
    ])
    expect(within(tabla()).getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Código',
      'Asunto y categoría',
      'Ambiente',
      'Solicitante',
      'Prioridad',
      'Estado',
      'Última actividad',
      'Acciones',
    ])
    expect(
      within(fila('TCK-2026-00143'))
        .getAllByRole('cell')
        .slice(0, 6)
        .map((celda) => celda.textContent),
    ).toEqual([
      'Parlantes del auditorio con ruidoAudiovisuales',
      'AUD-CEN',
      'Milagros Ccahuana Ríos',
      'Media',
      'En espera',
      '30/09/2026 09:35',
    ])
    expect(conteo()).toHaveTextContent('Mostrando 8 de 8 tickets')
    expect(document.title).toBe('Historial · Mesa de Ayuda')
  })

  it('cada fila lleva a la vista consolidada del ticket y a su historial de cambios', async () => {
    await renderHistorial()

    const acciones = within(fila('TCK-2026-00144'))
    expect(acciones.getByRole('link', { name: 'TCK-2026-00144' })).toHaveAttribute('href', '/tecnico/tickets/TCK-2026-00144')
    expect(acciones.getByRole('link', { name: 'Abrir bitácora de TCK-2026-00144' })).toHaveAttribute(
      'href',
      '/tecnico/tickets/TCK-2026-00144',
    )
    expect(acciones.getByRole('link', { name: 'Historial de TCK-2026-00144' })).toHaveAttribute(
      'href',
      '/tecnico/tickets/TCK-2026-00144/historial',
    )
  })

  it('abre el ticket desde su fila', async () => {
    const { user } = await renderHistorial()

    await user.click(screen.getByRole('link', { name: 'Abrir bitácora de TCK-2026-00141' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'TCK-2026-00141' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico/tickets/TCK-2026-00141')
  })

  it('busca por código o por asunto, sin distinguir mayúsculas ni tildes', async () => {
    const { user } = await renderHistorial()

    await user.type(buscador(), 'microfono')
    expect(codigos()).toEqual(['TCK-2026-00131'])
    expect(conteo()).toHaveTextContent('Mostrando 1 de 8 tickets')

    await user.clear(buscador())
    await user.type(buscador(), '0014')
    expect(codigos()).toEqual(['TCK-2026-00143', 'TCK-2026-00144', 'TCK-2026-00141'])
  })

  it('filtra por los estados en los que el técnico tiene tickets', async () => {
    const { user } = await renderHistorial()

    expect(within(filtroDeEstado()).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Estado: todos',
      'En atención (1)',
      'En espera (1)',
      'Resuelto (1)',
      'Cerrado (5)',
    ])
    await user.selectOptions(filtroDeEstado(), 'Cerrado (5)')

    expect(codigos()).toEqual(['TCK-2026-00131', 'TCK-2026-00126', 'TCK-2026-00118', 'TCK-2026-00114', 'TCK-2026-00103'])
    expect(conteo()).toHaveTextContent('Mostrando 5 de 8 tickets')
  })

  it('sin coincidencias lo indica y ofrece volver a ver todos los tickets', async () => {
    const { user } = await renderHistorial()

    await user.type(buscador(), 'ascensor')
    expect(screen.getByRole('heading', { name: 'Ningún ticket coincide con la búsqueda' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(conteo()).toHaveTextContent('Mostrando 0 de 8 tickets')

    await user.click(screen.getByRole('button', { name: 'Ver todos los tickets' }))
    expect(codigos()).toHaveLength(8)
    expect(buscador()).toHaveValue('')
  })

  it('un técnico sin tickets a su cargo ve el estado vacío', async () => {
    writeTable(
      'tickets',
      readTable('tickets').filter((ticket) => ticket.asignadoA !== DEMO.tecnico),
    )
    renderApp('/tecnico/historial', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { name: 'Aún no tienes tickets a tu cargo' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/a tu cargo ·/)).not.toBeInTheDocument()
  })
})
