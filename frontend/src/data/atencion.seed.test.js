import { describe, expect, it } from 'vitest'
import { bitacoraRepository } from '../repositories/atencion.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { validateEntrada } from '../utils/atencionValidators.js'

const unicos = (valores) => new Set(valores).size === valores.length
const esFechaIso = (valor) => new Date(valor).toISOString() === valor
const bitacoraDe = (ticketId) =>
  bitacoraRepository.findAll({ ticketId }).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))

// Valida que las tablas de la atención (HU-5) del seed cumplan sus reglas y se refieran a datos que existen.
describe('datos semilla · atención y cierre', () => {
  it('cada entrada de la bitácora es válida y es de un ticket y de una cuenta que existen', () => {
    const entradas = bitacoraRepository.findAll()

    expect(entradas).toHaveLength(44)
    expect(unicos(entradas.map((entrada) => entrada.id))).toBe(true)
    for (const entrada of entradas) {
      const ticket = ticketsRepository.findById(entrada.ticketId)
      expect(entrada.id).toMatch(/^bit-\d{3}$/)
      expect(validateEntrada(entrada)).toEqual({})
      expect(entrada.mensaje).toBe(entrada.mensaje.trim())
      expect(esFechaIso(entrada.creadoEn)).toBe(true)
      expect(ticket).not.toBeNull()
      expect(usuariosRepository.findById(entrada.autorId)).not.toBeNull()
      expect(entrada.creadoEn >= ticket.creadoEn).toBe(true)
      if (ticket.cerradoEn) expect(entrada.creadoEn <= ticket.cerradoEn).toBe(true)
    }
  })

  it('escribe quien atiende el ticket o quien lo reportó, y las notas internas son solo del equipo', () => {
    for (const entrada of bitacoraRepository.findAll()) {
      const ticket = ticketsRepository.findById(entrada.ticketId)
      const autor = usuariosRepository.findById(entrada.autorId)
      const loAtiende = autor.rol === 'supervisor' || autor.id === ticket.asignadoA

      if (entrada.tipo === 'interno') expect(loAtiende).toBe(true)
      else expect(loAtiende || autor.id === ticket.usuarioId).toBe(true)
    }
  })

  it('la bitácora de cada ticket empieza con el reporte de quien lo registró', () => {
    for (const ticket of ticketsRepository.findAll()) {
      expect(bitacoraDe(ticket.id)[0]).toMatchObject({
        tipo: 'publico',
        autorId: ticket.usuarioId,
        creadoEn: ticket.creadoEn,
      })
    }
  })

  it('TCK-2026-00144 reúne comentarios de los tres roles y una nota interna', () => {
    const entradas = bitacoraDe('tck-00144')

    expect(entradas.map(({ autorId, tipo }) => [autorId, tipo])).toEqual([
      ['usr-001', 'publico'],
      ['usr-003', 'publico'],
      ['usr-002', 'interno'],
      ['usr-002', 'publico'],
    ])
    expect(bitacoraDe('tck-00147')).toHaveLength(1)
  })
})
