import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

describe('HU-7.4 · ficha de usuario', () => {
  it('abre la ficha desde la lista, filtra reportes y reutiliza el detalle del ticket', async () => {
    const { user } = renderApp('/supervisor/usuarios', { usuario: DEMO.supervisor })
    const tabla = await screen.findByRole('table', { name: 'Cuentas de usuarios' })
    const fila = within(tabla).getByRole('rowheader', { name: 'Camila Quispe Ramos' }).closest('tr')
    await user.click(within(fila).getByRole('link', { name: 'Ver ficha' }))
    const reportes = await screen.findByRole('table', { name: 'Historial de reportes de la cuenta' })
    expect(ubicacionActual()).toBe('/supervisor/usuarios/usr-001')
    expect(screen.getByRole('heading', { name: 'Camila Quispe Ramos' })).toBeInTheDocument()
    expect(screen.getByText('Sin registro')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de los reportes' }), 'abierto')
    expect(within(reportes).getAllByRole('row')).toHaveLength(2)
    await user.click(within(reportes).getByRole('link', { name: 'TCK-2026-00147' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'TCK-2026-00147' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/supervisor/tickets/TCK-2026-00147')
  })

  it('desbloquea una cuenta desde su ficha con confirmación', async () => {
    const { user } = renderApp('/supervisor/usuarios/usr-004', { usuario: DEMO.supervisor })
    await screen.findByRole('button', { name: 'Desbloquear cuenta' })
    await user.click(screen.getByRole('button', { name: 'Desbloquear cuenta' }))
    const confirmacion = screen.getByRole('alertdialog')
    await user.click(within(confirmacion).getByRole('button', { name: 'Desbloquear cuenta' }))
    expect(await screen.findByRole('button', { name: 'Bloquear cuenta' })).toBeInTheDocument()
  })

  it('un usuario normal no puede abrir fichas ajenas', async () => {
    renderApp('/supervisor/usuarios/usr-002', { usuario: DEMO.usuario })
    expect(await screen.findByRole('heading', { name: /No tienes permiso/ })).toBeInTheDocument()
  })
})
