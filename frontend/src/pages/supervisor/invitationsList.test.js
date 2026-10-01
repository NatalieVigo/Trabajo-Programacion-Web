import { describe, expect, it } from 'vitest'
import { contarPorEstado, enlaceDeInvitacion, filtrarInvitaciones, resumirInvitaciones } from './invitationsList.js'

const invitacion = (nombres, apellidos, correo, estadoEfectivo) => ({ nombres, apellidos, correo, estadoEfectivo })

const INVITACIONES = [
  invitacion('Martín Alonso', 'Cárdenas Vela', 'mcardenas@ulima.edu.pe', 'pendiente'),
  invitacion('Rosa Elena', 'Huamán Torres', 'rhuaman@ulima.edu.pe', 'pendiente'),
  invitacion('Hernán', 'Loayza Pomar', 'hloayza@ulima.edu.pe', 'vencida'),
  invitacion('Julio César', 'Paredes Soto', 'jparedes@ulima.edu.pe', 'aceptada'),
]

const nombres = (lista) => lista.map((item) => item.nombres)
const SIN_FILTROS = { estado: '', busqueda: '' }

describe('invitationsList', () => {
  it('cuenta las invitaciones por estado efectivo, con el total en «Todas»', () => {
    expect(contarPorEstado(INVITACIONES)).toEqual({
      '': 4,
      pendiente: 2,
      aceptada: 1,
      vencida: 1,
      rechazada: 0,
      revocada: 0,
    })
  })

  it('resume el total y los estados que tienen alguna invitación', () => {
    expect(resumirInvitaciones(contarPorEstado(INVITACIONES))).toBe(
      '4 invitaciones · 2 pendientes, 1 aceptada, 1 vencida',
    )
    expect(resumirInvitaciones(contarPorEstado(INVITACIONES.slice(1, 2)))).toBe('1 invitación · 1 pendiente')
    expect(resumirInvitaciones(contarPorEstado([]))).toBe('0 invitaciones')
  })

  it('filtra por estado efectivo', () => {
    expect(nombres(filtrarInvitaciones(INVITACIONES, SIN_FILTROS))).toHaveLength(4)
    expect(nombres(filtrarInvitaciones(INVITACIONES, { ...SIN_FILTROS, estado: 'pendiente' }))).toEqual([
      'Martín Alonso',
      'Rosa Elena',
    ])
    expect(filtrarInvitaciones(INVITACIONES, { ...SIN_FILTROS, estado: 'revocada' })).toEqual([])
  })

  it('busca cada palabra en el nombre o el correo, sin distinguir mayúsculas ni tildes', () => {
    const buscar = (busqueda, estado = '') => nombres(filtrarInvitaciones(INVITACIONES, { estado, busqueda }))

    expect(buscar('  ROSA   huaman ')).toEqual(['Rosa Elena'])
    expect(buscar('torres rosa')).toEqual(['Rosa Elena'])
    expect(buscar('rosa paredes')).toEqual([])
    expect(buscar('cardenas')).toEqual(['Martín Alonso'])
    expect(buscar('JPAREDES@')).toEqual(['Julio César'])
    expect(buscar('ulima.edu.pe', 'vencida')).toEqual(['Hernán'])
    expect(buscar('huaman', 'aceptada')).toEqual([])
  })

  it('arma el enlace completo de la invitación', () => {
    expect(enlaceDeInvitacion('INV-TEC-2026-DEMO')).toBe(`${window.location.origin}/invitacion/INV-TEC-2026-DEMO`)
  })
})
