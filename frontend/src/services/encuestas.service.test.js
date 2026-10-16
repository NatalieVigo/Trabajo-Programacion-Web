import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../repositories/db.js'
import {
  DIAS_PLAZO_EDICION,
  obtenerEncuestaPorTicket,
  obtenerEncuestasUsuario,
  obtenerReporteSatisfaccionSupervisor,
  registrarEncuesta,
} from './encuestas.service.js'

describe('encuestas.service', () => {
  beforeEach(() => {
    resetDb()
  })

  it('define el plazo de edición en 7 días', () => {
    expect(DIAS_PLAZO_EDICION).toBe(7)
  })

  it('obtiene una encuesta por código de ticket o null si no existe', async () => {
    const encuesta = await obtenerEncuestaPorTicket('TCK-2026-00130')
    expect(encuesta).not.toBeNull()
    expect(encuesta.puntajeGeneral).toBe(4)

    const inexistente = await obtenerEncuestaPorTicket('TCK-INEXISTENTE')
    expect(inexistente).toBeNull()
  })

  it('permite registrar una nueva encuesta para un ticket', async () => {
    const res = await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      usuarioId: 'usr-001',
      puntajeGeneral: 5,
      rapidez: 5,
      trato: 5,
      solucion: 5,
      comentario: 'Excelente servicio en el aula.',
    })

    expect(res).toBeDefined()
    expect(res.codigoTicket).toBe('TCK-2026-00131')
    expect(res.puntajeGeneral).toBe(5)
    expect(res.comentario).toBe('Excelente servicio en el aula.')

    const guardada = await obtenerEncuestaPorTicket('TCK-2026-00131')
    expect(guardada).not.toBeNull()
    expect(guardada.puntajeGeneral).toBe(5)
  })

  it('permite editar una encuesta dentro del plazo de 7 días', async () => {
    await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      usuarioId: 'usr-001',
      puntajeGeneral: 4,
      rapidez: 4,
      trato: 4,
      solucion: 4,
      comentario: 'Atención buena.',
    })

    const editada = await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      usuarioId: 'usr-001',
      puntajeGeneral: 5,
      rapidez: 5,
      trato: 5,
      solucion: 5,
      comentario: 'Atención excelente tras revisión.',
    })

    expect(editada.puntajeGeneral).toBe(5)
    expect(editada.comentario).toBe('Atención excelente tras revisión.')
  })

  it('obtiene las encuestas de un usuario y calcula promedio y total', async () => {
    const res = await obtenerEncuestasUsuario('usr-001')
    expect(res.totalRespondidas).toBeGreaterThan(0)
    expect(Number(res.promedioGeneral)).toBeGreaterThan(0)
    expect(Array.isArray(res.encuestas)).toBe(true)

    const primera = res.encuestas[0]
    expect(primera).toHaveProperty('codigoTicket')
    expect(primera).toHaveProperty('asunto')
    expect(primera).toHaveProperty('tecnicoNombre')
    expect(primera).toHaveProperty('editable')
  })

  it('genera el reporte consolidado de satisfacción para el supervisor y filtra comentarios', async () => {
    const reporte = await obtenerReporteSatisfaccionSupervisor({ filtroPuntajeComentario: 'todos' })
    expect(reporte).toBeDefined()
    expect(reporte.tasaRespuesta).toBe(62)
    expect(Array.isArray(reporte.tablaTecnicos)).toBe(true)
    expect(Array.isArray(reporte.comentarios)).toBe(true)

    const reporteBajos = await obtenerReporteSatisfaccionSupervisor({ filtroPuntajeComentario: '1_3' })
    expect(reporteBajos.comentarios.every((c) => c.puntaje >= 1 && c.puntaje <= 3)).toBe(true)

    const reporteAltos = await obtenerReporteSatisfaccionSupervisor({ filtroPuntajeComentario: '4_5' })
    expect(reporteAltos.comentarios.every((c) => c.puntaje >= 4)).toBe(true)
  })
})
