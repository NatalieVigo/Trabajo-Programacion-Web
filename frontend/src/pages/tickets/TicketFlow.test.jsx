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
  it('registra un ticket con el ambiente escrito y su estado inicial en el historial', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Registrar un ticket' })
    // viene precargado el ambiente habitual de la cuenta, con su ubicación debajo
    expect(screen.getByLabelText('AMBIENTE')).toHaveValue('A-201')
    expect(screen.getByText('Aula · Pabellón A · piso 2')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-01')
    await user.selectOptions(screen.getByLabelText('SUBCATEGORÍA'), 'sub-01')
    await user.clear(screen.getByLabelText('AMBIENTE'))
    await user.type(screen.getByLabelText('AMBIENTE'), 'A-305')
    expect(screen.getByText('Aula · Pabellón A · piso 3')).toBeInTheDocument()
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

  it('«Buscar» completa el código con una parte y avisa si el ambiente no existe', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Registrar un ticket' })
    const campo = screen.getByLabelText('AMBIENTE')
    await user.clear(campo)
    await user.type(campo, 'a-30')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(campo).toHaveValue('A-305')
    expect(screen.getByText('Aula · Pabellón A · piso 3')).toBeInTheDocument()

    await user.clear(campo)
    await user.type(campo, 'Z-999')
    await user.type(screen.getByLabelText('ASUNTO'), 'Proyector apagado')
    await user.type(screen.getByLabelText('DESCRIPCIÓN'), 'El proyector no enciende desde el inicio de la clase.')
    await user.click(screen.getByRole('button', { name: 'Registrar ticket' }))

    expect(campo).toHaveAccessibleDescription('No encontramos ese ambiente. Revisa el código que aparece en la puerta.')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(readTable('tickets')).toHaveLength(14)
  })

  it('si el ticket repetido es propio muestra su código y enlaza a él', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Registrar un ticket' })
    // en A-201 ya hay un ticket de Audiovisuales en curso, y es de Camila
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-01')

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Ya existe un ticket abierto para A-201 en Audiovisuales: TCK-2026-00147, registrado hace')
    expect(within(aviso).getByRole('link', { name: 'Ver ese ticket' })).toHaveAttribute(
      'href',
      '/usuario/tickets/TCK-2026-00147',
    )
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-02')
    await waitFor(() => expect(screen.queryByText(/Ya existe un ticket/)).not.toBeInTheDocument())
  })

  it('si el ticket repetido es de otra persona solo avisa, sin mostrar su código', async () => {
    const { user } = renderApp('/usuario/tickets/nuevo', { usuario: DEMO.usuario })

    await screen.findByRole('heading', { name: 'Registrar un ticket' })
    // en N-402 hay un ticket de Eléctrico en curso, reportado por Renzo
    await user.selectOptions(screen.getByLabelText('CATEGORÍA'), 'cat-04')
    await user.clear(screen.getByLabelText('AMBIENTE'))
    await user.type(screen.getByLabelText('AMBIENTE'), 'N-402')

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Ya existe un ticket abierto para N-402 en Eléctrico, reportado por otra persona.')
    expect(aviso).not.toHaveTextContent('TCK-2026-00146')
    expect(within(aviso).queryByRole('link')).not.toBeInTheDocument()
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
