import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDb } from '../../repositories/db.js'
import { registrarEncuesta } from '../../services/encuestas.service.js'
import { DEMO, guardarSesion, renderApp } from '../../test/test-utils.jsx'

describe('MisEncuestasPage (Vista 6.2)', () => {
  beforeEach(() => {
    resetDb()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el listado de encuestas respondidas del usuario con sus métricas', async () => {
    renderApp('/usuario/encuestas', { usuario: DEMO.usuario })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis encuestas' })).toBeInTheDocument()
    // 5, 4, 4, 5, 3, 5 y 4
    expect(await screen.findByText('7 encuestas respondidas · promedio que diste: 4.3 de 5')).toBeInTheDocument()
    expect(screen.getByText(/TICKET \/ ASUNTO/i)).toBeInTheDocument()
    expect(screen.getByText(/PLAZO DE EDICIÓN/i)).toBeInTheDocument()
    expect(screen.getAllByText('Plazo vencido')).toHaveLength(7)
  })

  it('permite navegar al formulario de edición al hacer clic en Editar encuesta', async () => {
    // TCK-2026-00131 se cerró el 28/09: el 01/10 todavía se responde y queda editable 7 días
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-10-01T15:00:00.000Z')
    guardarSesion(DEMO.usuario)
    await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      puntajeGeneral: 5,
      rapidez: 5,
      trato: 5,
      solucion: 5,
      comentario: 'Recién respondida',
    })

    const { user } = renderApp('/usuario/encuestas', { usuario: DEMO.usuario })

    const botonEditar = await screen.findByRole('button', { name: 'Editar encuesta' })
    await user.click(botonEditar)

    await waitFor(() => {
      expect(screen.getByText('¿Cómo fue la atención de tu ticket?')).toBeInTheDocument()
    })
  })
})
