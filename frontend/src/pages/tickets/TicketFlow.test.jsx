import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { bitacoraRepository } from '../../repositories/atencion.repository.js'
import { readTable, resetDb, writeTable } from '../../repositories/db.js'
import { listarCola } from '../../services/cola.service.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

beforeEach(() => {
  resetDb()
})

describe('HU-3 · registro y seguimiento de tickets', () => {
  it('registra un ticket con aula escrita por la persona y conserva el enlace si coincide con el catálogo', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-01')
    await user.selectOptions(screen.getByLabelText('SUBCATEGORÍA'), 'sub-01')
    await user.type(screen.getByLabelText('AULA O AMBIENTE'), 'A-305')
    await user.type(screen.getByLabelText('ASUNTO'), 'Proyector apagado')
    await user.type(screen.getByLabelText('DESCRIPCIÓN'), 'El proyector no enciende desde el inicio de la clase.')
    await user.click(screen.getByRole('button', { name: 'Registrar ticket' }))

    expect(await screen.findByText('Tu ticket quedó registrado')).toBeInTheDocument()
    const ticket = readTable('tickets').find((row) => row.asunto === 'Proyector apagado')
    expect(ticket).toMatchObject({
      usuarioId: 'usr-001',
      categoriaId: 'cat-01',
      subcategoriaId: 'sub-01',
      ambienteId: 'amb-02',
      ambienteCodigo: 'A-305',
      prioridad: 'critica',
      estado: 'abierto',
    })
  })

  it('advierte cuando ya hay un ticket abierto en el aula escrita', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    await user.type(screen.getByLabelText('AULA O AMBIENTE'), 'A-201')

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/Ya existe un ticket en curso para el aula A-201/)
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-02')
    expect(alerta).toHaveTextContent(/Ya existe un ticket en curso para el aula A-201/)
  })

  it('filtra la lista por el código enviado desde el buscador global', async () => {
    renderApp('/usuario/tickets?codigo=TCK-2026-00147', { usuario: DEMO.usuario })

    expect(await screen.findByRole('button', { name: 'TCK-2026-00147' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'TCK-2026-00144' })).not.toBeInTheDocument()
  })

  it('guarda los comentarios del usuario en la bitácora compartida con atención', async () => {
    const { user } = renderApp('/usuario/tickets/tck-00144', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'TCK-2026-00144' })
    await user.type(screen.getByLabelText('AGREGAR INFORMACIÓN'), 'La falla continúa en este momento.')
    await user.click(screen.getByRole('button', { name: 'Enviar comentario' }))

    await waitFor(() => {
      expect(bitacoraRepository.findAll().some((entry) => entry.mensaje === 'La falla continúa en este momento.')).toBe(true)
    })
    expect(await screen.findByText('La falla continúa en este momento.')).toBeInTheDocument()
  })

  it('confirma la cancelación de un ticket propio que todavía no fue asignado', async () => {
    const { user } = renderApp('/usuario/tickets/tck-00147', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'TCK-2026-00147' })
    await user.click(screen.getByRole('button', { name: 'Cancelar ticket' }))
    const dialogo = screen.getByRole('alertdialog', { name: '¿Cancelar este ticket?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar ticket' }))

    expect(await screen.findByText('El ticket fue cancelado.')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
    expect(readTable('tickets').find((ticket) => ticket.id === 'tck-00147').estado).toBe('cancelado')
  })

  it('reabre con motivo dentro del plazo y devuelve el ticket a la cola compartida', async () => {
    const cerradoEn = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    writeTable(
      'tickets',
      readTable('tickets').map((ticket) =>
        ticket.id === 'tck-00103' ? { ...ticket, cerradoEn } : ticket,
      ),
    )
    const { user } = renderApp('/usuario/tickets/tck-00103', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'TCK-2026-00103' })
    await user.click(screen.getByRole('button', { name: 'Reabrir ticket' }))
    await user.type(screen.getByLabelText('MOTIVO DE REAPERTURA'), 'La falla volvió al encender el equipo.')
    await user.click(screen.getByRole('button', { name: 'Confirmar reapertura' }))

    expect(await screen.findByText('El ticket fue reabierto y volvió a la cola de atención.')).toBeInTheDocument()
    expect(screen.getByText('Reabierto')).toBeInTheDocument()
    expect(readTable('historial').at(-1).motivo).toBe('La falla volvió al encender el equipo.')
    await expect(listarCola('usr-003')).resolves.toMatchObject({
      tickets: expect.arrayContaining([expect.objectContaining({ codigo: 'TCK-2026-00103', estado: 'reabierto' })]),
    })
  })
})
