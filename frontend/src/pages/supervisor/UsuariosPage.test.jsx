import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'
import { descargarFilasCsv } from '../../utils/exportarCsv.js'

vi.mock('../../utils/exportarCsv.js', () => ({ descargarFilasCsv: vi.fn() }))

describe('HU-7.3 · usuarios', () => {
  it('busca, exporta el filtro completo y reutiliza la invitación de técnicos', async () => {
    const { user } = renderApp('/supervisor/usuarios', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Cuentas de usuarios' })
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'camila')
    await user.click(screen.getByRole('button', { name: 'Exportar cuentas' }))
    const filas = descargarFilasCsv.mock.calls.at(-1)[1]
    expect(filas).toHaveLength(2)
    expect(filas[1][0]).toBe('Camila Quispe Ramos')
    await user.click(screen.getByRole('button', { name: 'Invitar técnico' }))
    expect(screen.getByRole('dialog', { name: 'Nueva invitación' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog', { name: 'Nueva invitación' })).getByRole('combobox', { name: /Rol/ })).toHaveValue('tecnico')
  })

  it('valida el motivo y bloquea desde el listado', async () => {
    const { user } = renderApp('/supervisor/usuarios', { usuario: DEMO.supervisor })
    const tabla = await screen.findByRole('table', { name: 'Cuentas de usuarios' })
    const fila = within(tabla).getByRole('rowheader', { name: 'Camila Quispe Ramos' }).closest('tr')
    await user.click(within(fila).getByRole('button', { name: 'Bloquear' }))
    const modal = screen.getByRole('dialog', { name: 'Bloquear la cuenta de Camila Quispe Ramos' })
    await user.click(within(modal).getByRole('button', { name: 'Bloquear cuenta' }))
    expect(await within(modal).findByText(/Escribe el motivo del bloqueo/)).toBeInTheDocument()
    await user.type(within(modal).getByRole('textbox', { name: 'Motivo del bloqueo (obligatorio)' }), 'Reportes duplicados.')
    await user.click(within(modal).getByRole('checkbox', { name: 'Notificar a la persona por correo' }))
    await user.click(within(modal).getByRole('button', { name: 'Bloquear cuenta' }))
    await waitFor(() => expect(usuariosRepository.findById(DEMO.usuario).estado).toBe('bloqueado'))
  })

  it('pagina y vuelve a la primera página al filtrar', async () => {
    const plantilla = usuariosRepository.findById(DEMO.usuario)
    for (let i = 0; i < 20; i++) usuariosRepository.insert({ ...plantilla, id: `extra-${i}`, correo: `extra${i}@ulima.edu.pe`, nombres: `Extra ${i}` })
    const { user } = renderApp('/supervisor/usuarios', { usuario: DEMO.supervisor })
    await screen.findByText('Mostrando 1-15 de 30 cuentas')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Mostrando 16-30 de 30 cuentas')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rol' }), 'supervisor')
    expect(screen.getByText('Mostrando 1-1 de 1 cuentas')).toBeInTheDocument()
  })
})
