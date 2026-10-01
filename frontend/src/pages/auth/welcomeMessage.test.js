import { describe, expect, it } from 'vitest'
import { buildWelcomeMessage } from './welcomeMessage.js'

const camila = { nombres: 'Camila Alejandra', rol: 'usuario' }

describe('buildWelcomeMessage', () => {
  it('al usuario le resume sus tickets abiertos y encuestas pendientes (p05)', () => {
    expect(buildWelcomeMessage(camila, { ticketsAbiertos: 3, encuestasPendientes: 1 })).toBe(
      'Te damos la bienvenida, Camila. Tienes 3 tickets abiertos y 1 encuesta pendiente.',
    )
    expect(buildWelcomeMessage(camila, { ticketsAbiertos: 1, encuestasPendientes: 2 })).toBe(
      'Te damos la bienvenida, Camila. Tienes 1 ticket abierto y 2 encuestas pendientes.',
    )
  })

  it('al técnico le indica sus tickets asignados', () => {
    expect(buildWelcomeMessage({ nombres: 'Julio César', rol: 'tecnico' }, { asignados: 8 })).toBe(
      'Te damos la bienvenida, Julio. Tienes 8 tickets asignados.',
    )
  })

  it('al supervisor le indica los tickets sin asignar de la cola', () => {
    expect(buildWelcomeMessage({ nombres: 'Lucía', rol: 'supervisor' }, { colaSinAsignar: 1 })).toBe(
      'Te damos la bienvenida, Lucía. Hay 1 ticket sin asignar en la cola.',
    )
  })

  it('sin contadores solo saluda', () => {
    expect(buildWelcomeMessage(camila)).toBe('Te damos la bienvenida, Camila.')
    expect(buildWelcomeMessage(camila, null)).toBe('Te damos la bienvenida, Camila.')
  })
})
