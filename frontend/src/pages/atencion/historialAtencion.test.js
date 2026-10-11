import { describe, expect, it } from 'vitest'
import { HISTORIAL_SIN_FILTROS, contarPorEstado, filtrarAtendidos } from './historialAtencion.js'

const TICKETS = [
  { codigo: 'TCK-2026-00144', asunto: 'Punto de red caído en laboratorio', estado: 'en_atencion' },
  { codigo: 'TCK-2026-00143', asunto: 'Parlantes del auditorio con ruido', estado: 'en_espera' },
  { codigo: 'TCK-2026-00131', asunto: 'Micrófono inalámbrico sin señal', estado: 'cerrado' },
  { codigo: 'TCK-2026-00126', asunto: 'Punto de red sin enlace', estado: 'cerrado' },
]

const codigos = (tickets) => tickets.map(({ codigo }) => codigo)

describe('historialAtencion', () => {
  it('sin filtros devuelve todos los tickets, en el mismo orden', () => {
    expect(filtrarAtendidos(TICKETS, HISTORIAL_SIN_FILTROS)).toEqual(TICKETS)
  })

  it('busca en el código y en el asunto, sin distinguir mayúsculas ni tildes', () => {
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: '00131', estado: '' }))).toEqual(['TCK-2026-00131'])
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: ' tck-2026-0014 ', estado: '' }))).toEqual([
      'TCK-2026-00144',
      'TCK-2026-00143',
    ])
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: 'MICROFONO', estado: '' }))).toEqual(['TCK-2026-00131'])
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: 'punto de red', estado: '' }))).toEqual([
      'TCK-2026-00144',
      'TCK-2026-00126',
    ])
    expect(filtrarAtendidos(TICKETS, { busqueda: 'ascensor', estado: '' })).toEqual([])
  })

  it('filtra por estado y lo combina con la búsqueda', () => {
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: '', estado: 'cerrado' }))).toEqual(['TCK-2026-00131', 'TCK-2026-00126'])
    expect(codigos(filtrarAtendidos(TICKETS, { busqueda: 'red', estado: 'cerrado' }))).toEqual(['TCK-2026-00126'])
    expect(filtrarAtendidos(TICKETS, { busqueda: '', estado: 'resuelto' })).toEqual([])
  })

  it('cuenta los tickets de cada estado que tiene alguno, en el orden del ciclo de atención', () => {
    expect(contarPorEstado(TICKETS)).toEqual([
      { estado: 'en_atencion', total: 1 },
      { estado: 'en_espera', total: 1 },
      { estado: 'cerrado', total: 2 },
    ])
    expect(contarPorEstado([])).toEqual([])
  })
})
