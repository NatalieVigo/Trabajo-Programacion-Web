import { describe, expect, it } from 'vitest'
import {
  ambientesRepository,
  categoriasRepository,
  unidadesRepository,
  vinculosRepository,
} from '../repositories/catalogo.repository.js'
import { readTable } from '../repositories/db.js'
import { encuestasRepository, ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatDate } from '../utils/format.js'

const EN_CURSO = ['abierto', 'en_atencion', 'en_espera']
const CORREO_INSTITUCIONAL = /^[a-z0-9._%+-]+@(aloe\.)?ulima\.edu\.pe$/

// Valida que el seed cumpla el contrato de datos (docs/contrato-datos.md) y los escenarios de la SPEC.
describe('datos semilla', () => {
  it('usa correos institucionales únicos en minúsculas y teléfonos de 9 dígitos', () => {
    const usuarios = usuariosRepository.findAll()
    const correos = usuarios.map((usuario) => usuario.correo)

    expect(new Set(correos).size).toBe(usuarios.length)
    for (const usuario of usuarios) {
      expect(usuario.correo).toMatch(CORREO_INSTITUCIONAL)
      expect(usuario.telefono).toMatch(/^9\d{8}$/)
      expect(usuario.passwordSalt).toMatch(/^[0-9a-f]{32}$/)
      expect(usuario.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('incluye las cuentas de demostración de cada rol', () => {
    const camila = usuariosRepository.findByCorreo('camila.quispe@aloe.ulima.edu.pe')
    const julio = usuariosRepository.findByCorreo('jparedes@ulima.edu.pe')
    const lucia = usuariosRepository.findByCorreo('lmendoza@ulima.edu.pe')
    const diego = usuariosRepository.findByCorreo('diego.salas@aloe.ulima.edu.pe')

    expect(camila).toMatchObject({
      rol: 'usuario',
      estado: 'activo',
      unidad: 'Ingeniería de Sistemas',
      vinculo: 'Estudiante',
    })
    expect(ambientesRepository.findById(camila.ambienteHabitualId).codigo).toBe('A-201')
    expect(formatDate(camila.creadoEn)).toBe('14/03/2026')
    expect(julio).toMatchObject({ rol: 'tecnico', especialidades: ['cat-01', 'cat-02'], invitacionId: 'inv-004' })
    expect(lucia).toMatchObject({ rol: 'supervisor', especialidades: ['cat-03', 'cat-04'] })
    expect(diego).toMatchObject({ estado: 'bloqueado', motivoBloqueo: 'Reportes falsos reiterados.' })
    expect(usuariosRepository.findAll({ rol: 'usuario' })).toHaveLength(5)
    expect(usuariosRepository.findAll({ rol: 'tecnico' })).toHaveLength(4)
  })

  it('mantiene referencias válidas entre usuarios y catálogos', () => {
    const categoriaIds = new Set(categoriasRepository.findAll().map((categoria) => categoria.id))
    const unidades = unidadesRepository.findAll()
    const vinculos = vinculosRepository.findAll()

    expect(categoriaIds.size).toBe(7)
    expect(unidades).toHaveLength(15)
    expect(vinculos).toEqual(['Estudiante', 'Docente', 'Personal administrativo', 'Egresado'])
    for (const usuario of usuariosRepository.findAll()) {
      expect(unidades).toContain(usuario.unidad)
      if (usuario.rol === 'usuario') {
        expect(vinculos).toContain(usuario.vinculo)
        expect(usuario.especialidades).toEqual([])
      } else {
        expect(usuario.vinculo).toBeNull()
        expect(usuario.especialidades.length).toBeGreaterThanOrEqual(1)
        expect(usuario.especialidades.length).toBeLessThanOrEqual(3)
        usuario.especialidades.forEach((id) => expect(categoriaIds.has(id)).toBe(true))
      }
      if (usuario.ambienteHabitualId) {
        expect(ambientesRepository.findById(usuario.ambienteHabitualId)).not.toBeNull()
      }
    }
  })

  it('asigna cada ticket a un técnico habilitado en su categoría', () => {
    for (const ticket of ticketsRepository.findAll()) {
      expect(ticket.codigo).toBe(`TCK-2026-${ticket.id.slice(4)}`)
      expect(usuariosRepository.findById(ticket.usuarioId)).not.toBeNull()
      expect(categoriasRepository.findById(ticket.categoriaId)).not.toBeNull()
      expect(ambientesRepository.findById(ticket.ambienteId)).not.toBeNull()
      expect(Boolean(ticket.cerradoEn)).toBe(ticket.estado === 'cerrado')
      if (ticket.asignadoA) {
        expect(usuariosRepository.findById(ticket.asignadoA).especialidades).toContain(ticket.categoriaId)
      }
    }
  })

  it('cubre los contadores de Camila: 12 tickets, 3 en curso, 7 encuestas y 1 pendiente', () => {
    const tickets = ticketsRepository.findAll({ usuarioId: 'usr-001' })
    const encuestas = encuestasRepository.findAll({ usuarioId: 'usr-001' })
    const conEncuesta = new Set(encuestas.map((encuesta) => encuesta.ticketId))
    const sinEncuesta = tickets.filter((ticket) => ticket.estado === 'cerrado' && !conEncuesta.has(ticket.id))

    expect(tickets).toHaveLength(12)
    expect(tickets.filter((ticket) => EN_CURSO.includes(ticket.estado))).toHaveLength(3)
    expect(encuestas).toHaveLength(7)
    expect(sinEncuesta.map((ticket) => [ticket.codigo, formatDate(ticket.cerradoEn)])).toEqual([
      ['TCK-2026-00131', '28/09/2026'],
    ])
  })

  it('asigna 8 tickets a Julio', () => {
    expect(ticketsRepository.findAll({ asignadoA: 'usr-002' })).toHaveLength(8)
  })

  it('incluye las invitaciones de demostración', () => {
    const invitaciones = Object.fromEntries(readTable('invitaciones').map((inv) => [inv.token, inv]))

    expect(invitaciones['INV-TEC-2026-DEMO']).toMatchObject({ estado: 'pendiente', rol: 'tecnico', telefono: '951220874' })
    expect(invitaciones['INV-SUP-2026-DEMO']).toMatchObject({ estado: 'pendiente', rol: 'supervisor' })
    expect(formatDate(invitaciones['INV-TEC-2026-DEMO'].venceEn)).toBe('31/12/2026')
    expect(formatDate(invitaciones['INV-TEC-2026-VENCIDA'].venceEn)).toBe('12/09/2026')
    expect(invitaciones['INV-TEC-2026-USADA']).toMatchObject({ estado: 'aceptada', correo: 'jparedes@ulima.edu.pe' })
    expect(readTable('tokensRecuperacion')).toEqual([])
    expect(readTable('solicitudesAcceso')).toEqual([])
  })
})
