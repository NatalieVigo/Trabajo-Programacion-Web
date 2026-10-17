import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'

const tabla = () => screen.getByRole('table', { name: 'Tickets resueltos y cerrados' })
const codigos = () =>
  within(tabla())
    .getAllByRole('rowheader')
    .map((celda) => celda.textContent)
const fila = (codigo) => within(tabla()).getByRole('rowheader', { name: codigo }).closest('tr')
const celdas = (codigo) =>
  within(fila(codigo))
    .getAllByRole('cell')
    .map((celda) => celda.textContent)

async function renderHistorial() {
  const view = renderApp('/tecnico/historial', { usuario: DEMO.tecnico })
  await screen.findByRole('table', { name: 'Tickets resueltos y cerrados' })
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
  it('lista los tickets resueltos y cerrados del técnico con las columnas de la bandeja (p24)', async () => {
    await renderHistorial()

    expect(screen.getByRole('heading', { level: 1, name: 'Historial' })).toBeInTheDocument()
    // los que siguen en curso no salen aquí
    expect(codigos()).toEqual([
      'TCK-2026-00141',
      'TCK-2026-00131',
      'TCK-2026-00126',
      'TCK-2026-00118',
      'TCK-2026-00114',
      'TCK-2026-00103',
    ])
    expect(within(tabla()).getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Código',
      'Asunto',
      'Categoría',
      'Ambiente',
      'Solicitante',
      'Prioridad',
      'Estado',
      'Plazo',
      'Acción',
    ])
    expect(celdas('TCK-2026-00131').slice(0, 7)).toEqual([
      'Micrófono inalámbrico sin señal',
      'Audiovisuales',
      'AUD-CEN',
      'Camila Quispe Ramos',
      'Media',
      'Cerrado',
      'Cerrado el 28/09/2026',
    ])
    expect(celdas('TCK-2026-00141')[6]).toMatch(/^Atendido (a tiempo|fuera de plazo)$/)
    expect(document.title).toBe('Historial · Mesa de Ayuda')
  })

  it('no tiene búsqueda, filtros ni contadores: solo lo que dibuja la bandeja de p24', async () => {
    await renderHistorial()

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Mostrando/)).not.toBeInTheDocument()
    expect(within(fila('TCK-2026-00131')).queryByRole('link', { name: /^Historial de/ })).not.toBeInTheDocument()
  })

  it('cada fila lleva a la vista consolidada del ticket (p25)', async () => {
    const { user } = await renderHistorial()

    const acciones = within(fila('TCK-2026-00141'))
    expect(acciones.getByRole('link', { name: 'TCK-2026-00141' })).toHaveAttribute('href', '/tecnico/tickets/TCK-2026-00141')
    await user.click(acciones.getByRole('link', { name: 'Abrir bitácora de TCK-2026-00141' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'TCK-2026-00141' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico/tickets/TCK-2026-00141')
  })

  it('un técnico sin tickets resueltos ni cerrados ve el estado vacío', async () => {
    writeTable(
      'tickets',
      readTable('tickets').filter(
        (ticket) => ticket.asignadoA !== DEMO.tecnico || !['resuelto', 'cerrado'].includes(ticket.estado),
      ),
    )
    renderApp('/tecnico/historial', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { name: 'Aún no tienes tickets resueltos' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
