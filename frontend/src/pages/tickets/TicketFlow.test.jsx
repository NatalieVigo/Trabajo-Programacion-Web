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
  it('registra un ticket con el aula elegida del catálogo y su estado inicial en el historial', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    // El aula llega precargada con el ambiente habitual de la cuenta (A-201) y se puede cambiar.
    expect(screen.getByLabelText('AULA O AMBIENTE')).toHaveValue('amb-01')
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-01')
    await user.selectOptions(screen.getByLabelText('SUBCATEGORÍA'), 'sub-01')
    await user.selectOptions(screen.getByLabelText('AULA O AMBIENTE'), 'A-305 · Aula A-305')
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
      prioridad: 'critica',
      estado: 'abierto',
    })
    expect(readTable('historial').filter((evento) => evento.ticketId === ticket.id)).toEqual([
      expect.objectContaining({ tipo: 'estado', estado: 'abierto', autorId: 'usr-001', creadoEn: ticket.creadoEn }),
    ])
  })

  it('advierte cuando ya hay un ticket en curso del mismo ambiente y la misma categoría', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    // En A-201 hay un ticket en curso de Audiovisuales (TCK-2026-00147).
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-01')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un ticket de Audiovisuales en curso para el aula A-201.',
    )
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-02')
    await waitFor(() => expect(screen.queryByText(/Ya existe un ticket de/)).not.toBeInTheDocument())
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

  it('no ofrece la encuesta mientras el ticket solo está resuelto', async () => {
    renderApp('/usuario/tickets/tck-00141', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'TCK-2026-00141' })
    expect(screen.queryByRole('button', { name: 'Responder encuesta' })).not.toBeInTheDocument()
  })

  it('muestra el acceso a la encuesta cuando el ticket está cerrado y navega al formulario de HU-6', async () => {
    const { user } = renderApp('/usuario/tickets/tck-00131', { usuario: DEMO.usuario })

    const botonEncuesta = await screen.findByRole('button', { name: 'Responder encuesta' })
    await user.click(botonEncuesta)

    expect(await screen.findByText('¿Cómo fue la atención de tu ticket?')).toBeInTheDocument()
    expect(screen.getByText('TCK-2026-00131')).toBeInTheDocument()
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
