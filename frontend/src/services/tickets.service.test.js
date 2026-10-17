import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb, readTable, writeTable } from '../repositories/db.js'
import { agregarEntrada, obtenerAtencion } from './atencion.service.js'
import { listarCola } from './cola.service.js'
import { ServiceError } from './ServiceError.js'
import {
  cancelarTicket,
  crearTicket,
  estaDentroDelPlazoDeReapertura,
  existeTicketEnCurso,
  reabrirTicket,
} from './tickets.service.js'

const USUARIO = 'usr-001'
const NUEVO_TICKET = {
  categoriaId: 'cat-01',
  subcategoriaId: 'sub-01',
  ambienteId: 'amb-02',
  ambienteCodigo: 'A-305',
  asunto: 'Proyector apagado',
  descripcion: 'El proyector no enciende desde el inicio de la clase.',
}

beforeEach(() => {
  resetDb()
})

describe('tickets.service · crearTicket', () => {
  it('guarda el ticket con el contrato compartido por catálogo, cola y atención', async () => {
    const ticket = await crearTicket(NUEVO_TICKET, USUARIO)

    expect(ticket).toMatchObject({
      id: 'tck-00148',
      codigo: expect.stringMatching(/^TCK-\d{4}-00148$/),
      usuarioId: USUARIO,
      categoriaId: 'cat-01',
      subcategoriaId: 'sub-01',
      ambienteId: 'amb-02',
      prioridad: 'critica',
      tiempoEsperadoHoras: 2,
      estado: 'abierto',
      cerradoEn: null,
      asignadoA: null,
    })
    expect(ticket.creadoEn).toBe(new Date(ticket.creadoEn).toISOString())
    expect(readTable('tickets')).toContainEqual(ticket)
  })

  it('rechaza una subcategoría que pertenece a otra categoría', async () => {
    await expect(crearTicket({ ...NUEVO_TICKET, subcategoriaId: 'sub-05' }, USUARIO)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: { subcategoriaId: expect.any(String) },
    })
  })

  it('rechaza una cuenta que no está habilitada para registrar tickets', async () => {
    await expect(crearTicket(NUEVO_TICKET, 'usr-004')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('tickets.service · existeTicketEnCurso', () => {
  it('avisa de tickets en curso y deja de avisar cuando el único coincide está cerrado', async () => {
    const coincidencia = { categoriaId: 'cat-01', ambienteId: 'amb-01' }
    expect(await existeTicketEnCurso(coincidencia)).toBe(true)

    writeTable(
      'tickets',
      readTable('tickets').map((ticket) =>
        ticket.id === 'tck-00147' ? { ...ticket, estado: 'cerrado' } : ticket,
      ),
    )

    expect(await existeTicketEnCurso(coincidencia)).toBe(false)
  })

  it('avisa por el aula aunque el ticket existente tenga otra categoría', async () => {
    expect(await existeTicketEnCurso({ categoriaId: 'cat-02', ambienteCodigo: 'a-201' })).toBe(true)
  })

  it('acepta un aula fuera del catálogo y la muestra en la cola sin crearla en el catálogo', async () => {
    const ticket = await crearTicket({ ...NUEVO_TICKET, ambienteCodigo: 'Aula D-999' }, USUARIO)

    expect(ticket).toMatchObject({ ambienteId: null, ambienteCodigo: 'Aula D-999' })
    expect((await listarCola('usr-003')).tickets).toContainEqual(
      expect.objectContaining({ codigo: ticket.codigo, ambiente: 'Aula D-999' }),
    )
    await expect(obtenerAtencion(ticket.codigo, 'usr-003')).resolves.toMatchObject({
      ticket: { ambiente: { id: null, codigo: 'Aula D-999' } },
    })
  })

  it('devuelve errores de validación si faltan los campos obligatorios', async () => {
    const error = await crearTicket({ ...NUEVO_TICKET, asunto: ' ' }, USUARIO).catch((reason) => reason)

    expect(error).toBeInstanceOf(ServiceError)
    expect(error.fieldErrors).toHaveProperty('asunto')
  })
})

describe('tickets.service · cancelación y reapertura', () => {
  it('cancela un ticket propio todavía no asignado y registra el cambio en el historial', async () => {
    const cancelado = await cancelarTicket('tck-00147', USUARIO)

    expect(cancelado).toMatchObject({ id: 'tck-00147', estado: 'cancelado', cerradoEn: null })
    expect(readTable('historial').at(-1)).toMatchObject({
      ticketId: 'tck-00147',
      tipo: 'estado',
      estado: 'cancelado',
      autorId: USUARIO,
    })
  })

  it('no permite cancelar un ticket que ya fue asignado', async () => {
    await expect(cancelarTicket('tck-00144', USUARIO)).rejects.toMatchObject({
      code: 'TICKET_NOT_CANCELLABLE',
    })
  })

  it('no permite agregar comentarios a un ticket cancelado', async () => {
    const cancelado = await cancelarTicket('tck-00147', USUARIO)

    await expect(
      agregarEntrada(cancelado.codigo, { tipo: 'publico', mensaje: 'Comentario después de cancelar.' }, USUARIO),
    ).rejects.toMatchObject({ code: 'TICKET_CLOSED' })
  })

  it('reabre un ticket dentro de los 7 días, conserva el motivo y lo deja disponible para la cola', async () => {
    const cerradoEn = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    writeTable(
      'tickets',
      readTable('tickets').map((ticket) =>
        ticket.id === 'tck-00103' ? { ...ticket, cerradoEn } : ticket,
      ),
    )

    const reabierto = await reabrirTicket('tck-00103', 'La falla volvió al encender el equipo.', USUARIO)

    expect(reabierto).toMatchObject({ id: 'tck-00103', estado: 'reabierto', cerradoEn: null })
    expect(readTable('historial').at(-1)).toMatchObject({
      ticketId: 'tck-00103',
      estado: 'reabierto',
      autorId: USUARIO,
      motivo: 'La falla volvió al encender el equipo.',
    })
  })

  it('rechaza la reapertura una vez vencido el plazo', async () => {
    const cerradoEn = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    writeTable(
      'tickets',
      readTable('tickets').map((ticket) =>
        ticket.id === 'tck-00103' ? { ...ticket, cerradoEn } : ticket,
      ),
    )

    expect(estaDentroDelPlazoDeReapertura(readTable('tickets').find((ticket) => ticket.id === 'tck-00103'))).toBe(false)
    await expect(reabrirTicket('tck-00103', 'La falla volvió.', USUARIO)).rejects.toMatchObject({
      code: 'REOPEN_PERIOD_EXPIRED',
    })
  })

  it('exige explicar el motivo de reapertura', async () => {
    await expect(reabrirTicket('tck-00103', ' ', USUARIO)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: { motivo: expect.any(String) },
    })
  })
})
