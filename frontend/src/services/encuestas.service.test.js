import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, resetDb } from '../repositories/db.js'
import { espiarApi, ultimaPeticion } from '../test/espiarApi.js'
import { DEMO, guardarSesion } from '../test/test-utils.jsx'
import {
  DIAS_PLAZO_EDICION,
  obtenerEncuestaPorTicket,
  obtenerEncuestasUsuario,
  obtenerReporteSatisfaccionSupervisor,
  registrarEncuesta,
} from './encuestas.service.js'

// las reglas se prueban en test/encuestas.test.js del backend; aquí, con el simulador de la API
const CAMILA = 'Bearer prueba.usr-001'
const respuesta = { puntajeGeneral: 5, rapidez: 4, trato: 5, solucion: 4, comentario: '' }

describe('encuestas.service', () => {
  beforeEach(() => {
    resetDb()
    guardarSesion(DEMO.usuario)
    // TCK-2026-00131 se cerró el 28/09: se responde hasta el 05/10
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-10-01T15:00:00.000Z')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('define el plazo de edición en 7 días', () => {
    expect(DIAS_PLAZO_EDICION).toBe(7)
  })

  it('obtiene una encuesta por código de ticket o null si no existe', async () => {
    const fetch = espiarApi()
    const encuesta = await obtenerEncuestaPorTicket('TCK-2026-00130')
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/encuestas/TCK-2026-00130', method: 'GET', token: CAMILA })
    expect(encuesta).toMatchObject({ puntajeGeneral: 4, trato: 5, editable: false })

    expect(await obtenerEncuestaPorTicket('TCK-2026-00131')).toBeNull()
    expect(await obtenerEncuestaPorTicket('TCK-INEXISTENTE')).toBeNull()
  })

  it('permite registrar una nueva encuesta para un ticket', async () => {
    const fetch = espiarApi()
    const res = await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      puntajeGeneral: 5,
      rapidez: 5,
      trato: 5,
      solucion: 5,
      comentario: 'Excelente servicio en el aula.',
    })

    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/encuestas/TCK-2026-00131', method: 'PUT', token: CAMILA })
    expect(res).toMatchObject({ codigoTicket: 'TCK-2026-00131', puntajeGeneral: 5, comentario: 'Excelente servicio en el aula.' })
    expect((await obtenerEncuestaPorTicket('TCK-2026-00131')).puntajeGeneral).toBe(5)
  })

  it('permite editar una encuesta dentro del plazo de 7 días, sin crear otra', async () => {
    await registrarEncuesta({ ...respuesta, codigoTicket: 'TCK-2026-00131', puntajeGeneral: 4, comentario: 'Atención buena.' })

    const editada = await registrarEncuesta({
      ...respuesta,
      codigoTicket: 'TCK-2026-00131',
      comentario: 'Atención excelente tras revisión.',
    })

    expect(editada).toMatchObject({ puntajeGeneral: 5, comentario: 'Atención excelente tras revisión.' })
    expect(readTable('encuestas').filter((e) => e.ticketId === 'tck-00131')).toHaveLength(1)
  })

  it('obtiene las encuestas de un usuario y calcula promedio y total', async () => {
    const res = await obtenerEncuestasUsuario()
    expect(res).toMatchObject({ totalRespondidas: 7, promedioGeneral: 4.3 })
    expect(res.encuestas[0]).toMatchObject({
      codigoTicket: 'TCK-2026-00130',
      asunto: 'Extensión eléctrica en mal estado',
      tecnicoNombre: 'Iván Zegarra Pinto',
      editable: false,
    })
  })

  it('genera el reporte de satisfacción del periodo para el supervisor y filtra comentarios', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()
    const agosto = { desde: '2026-08-01', hasta: '2026-09-01' }

    const reporte = await obtenerReporteSatisfaccionSupervisor({ ...agosto, filtroPuntajeComentario: 'todos' })

    expect(ultimaPeticion(fetch).ruta).toBe('/encuestas/satisfaccion?desde=2026-08-01&hasta=2026-09-01&puntaje=todos')
    expect(reporte).toMatchObject({ totalRespondidas: 7, promedioGeneral: 4.3, tasaRespuesta: 100 })
    expect(reporte.tablaTecnicos).toHaveLength(4)
    expect(reporte.porCategoria).toHaveLength(5)
    expect(reporte.comentarios).toHaveLength(5)

    const bajos = await obtenerReporteSatisfaccionSupervisor({ ...agosto, filtroPuntajeComentario: '1_3' })
    expect(bajos.comentarios.map((c) => c.puntaje)).toEqual([3])
    const altos = await obtenerReporteSatisfaccionSupervisor({ ...agosto, filtroPuntajeComentario: '4_5' })
    expect(altos.comentarios.every((c) => c.puntaje >= 4)).toBe(true)
  })

  it('el reporte solo lo ve el supervisor', async () => {
    await expect(
      obtenerReporteSatisfaccionSupervisor({ desde: '2026-08-01', hasta: '2026-09-01' }),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('encuestas.service · validaciones del servidor', () => {
  beforeEach(() => {
    resetDb()
    guardarSesion(DEMO.usuario)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-10-01T15:00:00.000Z')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no deja calificar el ticket de otra persona', async () => {
    await expect(registrarEncuesta({ ...respuesta, codigoTicket: 'TCK-2026-00143' })).rejects.toMatchObject({
      status: 404,
      code: 'TICKET_NOT_FOUND',
    })
  })

  it('solo deja calificar un ticket cerrado', async () => {
    await expect(registrarEncuesta({ ...respuesta, codigoTicket: 'TCK-2026-00144' })).rejects.toMatchObject({
      status: 409,
      code: 'TICKET_NOT_CLOSED',
    })
  })

  it('exige puntajes enteros del 1 al 5', async () => {
    await expect(registrarEncuesta({ ...respuesta, codigoTicket: 'TCK-2026-00131', trato: 7 })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { trato: 'Califica del 1 al 5.' },
    })
  })

  it('no deja editar pasados 7 días desde la respuesta', async () => {
    await expect(registrarEncuesta({ ...respuesta, codigoTicket: 'TCK-2026-00130' })).rejects.toMatchObject({
      status: 409,
      code: 'SURVEY_EDIT_EXPIRED',
    })
  })
})
