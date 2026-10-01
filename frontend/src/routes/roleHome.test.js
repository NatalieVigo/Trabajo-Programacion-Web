import { describe, expect, it } from 'vitest'
import { ROLES, getRoleHome } from './roleHome.js'

describe('roleHome', () => {
  it('lleva a cada rol a su vista principal (SPEC §9)', () => {
    expect(getRoleHome('usuario')).toEqual({ path: '/usuario', label: 'Inicio', ticketsPath: '/usuario/tickets' })
    expect(getRoleHome('tecnico')).toEqual({ path: '/tecnico', label: 'Mi bandeja', ticketsPath: '/tecnico' })
    expect(getRoleHome('supervisor')).toEqual({
      path: '/supervisor',
      label: 'Tablero',
      ticketsPath: '/supervisor/cola',
    })
  })

  it('define una vista principal para cada rol', () => {
    expect(ROLES).toEqual(['usuario', 'tecnico', 'supervisor'])
    ROLES.forEach((rol) => expect(getRoleHome(rol).path).toBe(`/${rol}`))
  })
})
