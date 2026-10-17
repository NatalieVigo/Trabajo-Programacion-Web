import { describe, expect, it } from 'vitest'
import { bitacoraRepository, historialRepository } from '../repositories/atencion.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { validateEntrada, validateMotivoEspera, validateSolucion } from '../utils/atencionValidators.js'
import { ESTADOS, esTransicionValida } from '../utils/estadosTicket.js'
import { fechaEnLima, finDelDiaEnLima } from '../utils/fechaLima.js'

const unicos = (valores) => new Set(valores).size === valores.length
const esFechaIso = (valor) => new Date(valor).toISOString() === valor
const porAntiguedad = (a, b) => a.creadoEn.localeCompare(b.creadoEn)
const bitacoraDe = (ticketId) => bitacoraRepository.findAll({ ticketId }).sort(porAntiguedad)
const historialDe = (ticketId) => historialRepository.findAll({ ticketId }).sort(porAntiguedad)
const estadosDe = (ticketId) => historialDe(ticketId).filter((evento) => evento.tipo === 'estado')

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

  it('cada evento del historial es un cambio de estado o una asignación, de un ticket y una cuenta que existen', () => {
    const eventos = historialRepository.findAll()

    expect(eventos).toHaveLength(66)
    expect(unicos(eventos.map((evento) => evento.id))).toBe(true)
    for (const evento of eventos) {
      expect(evento.id).toMatch(/^his-\d{3}$/)
      expect(esFechaIso(evento.creadoEn)).toBe(true)
      expect(ticketsRepository.findById(evento.ticketId)).not.toBeNull()
      expect(usuariosRepository.findById(evento.autorId)).not.toBeNull()
      if (evento.tipo === 'estado') {
        expect(ESTADOS).toContain(evento.estado)
        expect(evento.asignadoA).toBeNull()
      } else {
        // asignar no cambia el estado del ticket
        expect(evento.tipo).toBe('asignacion')
        expect(evento.estado).toBeNull()
        expect(usuariosRepository.findById(evento.autorId).rol).toBe('supervisor')
        expect(usuariosRepository.findById(evento.asignadoA).rol).toBe('tecnico')
      }
    }
  })

  it('el historial de cada ticket empieza cuando se registró y termina en su estado actual', () => {
    for (const ticket of ticketsRepository.findAll()) {
      const estados = estadosDe(ticket.id)

      expect(estados[0]).toMatchObject({ estado: 'abierto', autorId: ticket.usuarioId, creadoEn: ticket.creadoEn })
      expect(estados.at(-1).estado).toBe(ticket.estado)
      expect(unicos(historialDe(ticket.id).map((evento) => evento.creadoEn))).toBe(true)
      if (ticket.estado === 'cerrado') expect(estados.at(-1).creadoEn).toBe(ticket.cerradoEn)
    }
  })

  it('cada cambio de estado es uno que el anterior admite y lo hace el técnico asignado', () => {
    for (const ticket of ticketsRepository.findAll()) {
      const estados = estadosDe(ticket.id)

      estados.slice(1).forEach((evento, indice) => {
        const anterior = estados[indice].estado
        const esCierre = evento.estado === 'cerrado' && ['en_atencion', 'resuelto'].includes(anterior)
        expect(esCierre || esTransicionValida(anterior, evento.estado)).toBe(true)
        expect(evento.autorId).toBe(ticket.asignadoA)
      })
    }
  })

  it('un ticket con técnico tiene su asignación antes de que empiece a atenderlo', () => {
    for (const ticket of ticketsRepository.findAll()) {
      const asignaciones = historialDe(ticket.id).filter((evento) => evento.tipo === 'asignacion')

      if (!ticket.asignadoA) {
        expect(historialDe(ticket.id)).toHaveLength(1)
        continue
      }
      expect(asignaciones.map((evento) => evento.asignadoA)).toEqual([ticket.asignadoA])
      expect(asignaciones[0].creadoEn < estadosDe(ticket.id)[1].creadoEn).toBe(true)
    }
  })

  it('cubre los estados en curso: Julio tiene un ticket resuelto, uno en espera y uno en atención', () => {
    const enCursoDeJulio = ticketsRepository.findAll({ asignadoA: 'usr-002' }).filter((ticket) => ticket.estado !== 'cerrado')

    expect(enCursoDeJulio.map((ticket) => [ticket.codigo, ticket.estado])).toEqual([
      ['TCK-2026-00141', 'resuelto'],
      ['TCK-2026-00143', 'en_espera'],
      ['TCK-2026-00144', 'en_atencion'],
    ])
    expect(estadosDe('tck-00130').map((evento) => evento.estado)).toEqual([
      'abierto',
      'en_atencion',
      'en_espera',
      'resuelto',
      'cerrado',
    ])
  })

  it('solo las esperas tienen motivo y fecha estimada de retorno, que es el fin de un día posterior o igual', () => {
    const eventos = historialRepository.findAll()
    const esperas = eventos.filter((evento) => evento.estado === 'en_espera')

    expect(esperas).toHaveLength(7)
    for (const espera of esperas) {
      expect(validateMotivoEspera(espera.motivo)).toBeNull()
      expect(espera.retornoEstimado).toBe(finDelDiaEnLima(fechaEnLima(espera.retornoEstimado)))
      expect(espera.retornoEstimado > espera.creadoEn).toBe(true)
    }
    for (const evento of eventos.filter((otro) => otro.estado !== 'en_espera')) {
      expect(evento.motivo).toBeNull()
      expect(evento.retornoEstimado).toBeNull()
    }
  })

  it('cada ticket cerrado se cerró una vez, con su solución, y ningún otro cambio de estado la tiene', () => {
    const eventos = historialRepository.findAll()

    for (const ticket of ticketsRepository.findAll()) {
      const cierres = estadosDe(ticket.id).filter((evento) => evento.estado === 'cerrado')
      expect(cierres).toHaveLength(ticket.estado === 'cerrado' ? 1 : 0)
      cierres.forEach((cierre) => expect(validateSolucion(cierre.solucion)).toBeNull())
    }
    expect(eventos.filter((evento) => evento.estado === 'cerrado')).toHaveLength(8)
    eventos.filter((evento) => evento.estado !== 'cerrado').forEach((evento) => expect(evento.solucion).toBeNull())
  })
})
