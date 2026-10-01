import { describe, expect, it } from 'vitest'
import { createReadOnlyRepository, createRepository } from './createRepository.js'
import { readTable } from './db.js'
import { usuariosRepository } from './usuarios.repository.js'

const solicitud = {
  id: 'sol-001',
  usuarioId: 'usr-001',
  recurso: 'la cola de atención',
  creadaEn: '2026-09-30T15:00:00.000Z',
}

describe('createRepository (CRUD genérico)', () => {
  const solicitudes = createRepository('solicitudesAcceso')

  it('inserta un registro y lo encuentra por id', () => {
    expect(solicitudes.insert(solicitud)).toEqual(solicitud)

    expect(solicitudes.findById('sol-001')).toEqual(solicitud)
    expect(readTable('solicitudesAcceso')).toEqual([solicitud])
  })

  it('rechaza ids repetidos y registros sin id', () => {
    solicitudes.insert(solicitud)

    expect(() => solicitudes.insert(solicitud)).toThrow('Ya existe un registro')
    expect(() => solicitudes.insert({ recurso: 'el tablero' })).toThrow('necesita un id')
  })

  it('filtra con un predicado o con un objeto de igualdades', () => {
    const usuarios = createRepository('usuarios')

    expect(usuarios.findAll()).toHaveLength(10)
    expect(usuarios.findAll({ rol: 'tecnico', estado: 'activo' })).toHaveLength(4)
    expect(usuarios.findAll((usuario) => usuario.estado === 'bloqueado').map((usuario) => usuario.id)).toEqual([
      'usr-004',
    ])
    expect(usuarios.findOne({ correo: 'lmendoza@ulima.edu.pe' })?.id).toBe('usr-003')
    expect(usuarios.findOne({ correo: 'nadie@ulima.edu.pe' })).toBeNull()
    expect(usuarios.findById('usr-999')).toBeNull()
  })

  it('actualiza combinando campos sin permitir cambiar el id', () => {
    solicitudes.insert(solicitud)

    const actualizada = solicitudes.update('sol-001', { recurso: 'el tablero', id: 'sol-777' })

    expect(actualizada).toEqual({ ...solicitud, recurso: 'el tablero' })
    expect(solicitudes.findById('sol-001').recurso).toBe('el tablero')
    expect(solicitudes.update('sol-999', { recurso: 'otro' })).toBeNull()
  })

  it('elimina registros', () => {
    solicitudes.insert(solicitud)

    expect(solicitudes.remove('sol-001')).toBe(true)
    expect(solicitudes.remove('sol-001')).toBe(false)
    expect(solicitudes.findAll()).toEqual([])
  })

  it('la versión de solo lectura no expone operaciones de escritura', () => {
    const tickets = createReadOnlyRepository('tickets')

    expect(Object.keys(tickets).sort()).toEqual(['findAll', 'findById', 'findOne'])
    expect(tickets.findAll()).toHaveLength(14)
  })
})

describe('usuariosRepository', () => {
  it('busca por correo sin distinguir mayúsculas ni espacios', () => {
    expect(usuariosRepository.findByCorreo('  Camila.Quispe@ALOE.ulima.edu.pe ')?.id).toBe('usr-001')
    expect(usuariosRepository.findByCorreo('no.existe@ulima.edu.pe')).toBeNull()
  })
})
