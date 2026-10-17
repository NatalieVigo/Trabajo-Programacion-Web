import { describe, expect, it } from 'vitest'
import { FILTROS_COLA, filtrarCola } from './colaList.js'

const tickets = [
  {
    codigo: 'TCK-1',
    asunto: 'Proyector sin imagen',
    solicitante: 'Camila Quispe',
    prioridad: 'alta',
    estado: 'abierto',
    creadoEn: '2026-10-14T08:00:00Z',
    tecnicoId: 'tec-1',
  },
  {
    codigo: 'TCK-2',
    asunto: 'Punto de red',
    solicitante: 'Renzo Salazar',
    prioridad: 'critica',
    estado: 'abierto',
    creadoEn: '2026-10-14T09:00:00Z',
    tecnicoId: null,
  },
]

describe('filtros de la cola integrada', () => {
  it('busca por solicitante sin distinguir mayúsculas o acentos', () => {
    expect(
      filtrarCola(tickets, { ...FILTROS_COLA, busqueda: 'Cámila QUISPE' }),
    ).toEqual([tickets[0]])
  })
  it('pone primero los tickets sin técnico en el orden sin atención', () => {
    expect(
      filtrarCola(tickets, { ...FILTROS_COLA, orden: 'sin_atencion' }).map(
        (ticket) => ticket.codigo,
      ),
    ).toEqual(['TCK-2', 'TCK-1'])
  })
})
