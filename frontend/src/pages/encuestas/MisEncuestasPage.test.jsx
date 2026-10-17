import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../repositories/db.js'
import { registrarEncuesta } from '../../services/encuestas.service.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

describe('MisEncuestasPage (Vista 6.2)', () => {
  beforeEach(() => {
    resetDb()
  })

  it('muestra el listado de encuestas respondidas del usuario con sus métricas', async () => {
    renderApp('/usuario/encuestas', { usuario: DEMO.usuario })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis encuestas' })).toBeInTheDocument()
    expect(screen.getByText(/encuestas respondidas/i)).toBeInTheDocument()
    expect(screen.getByText(/TICKET \/ ASUNTO/i)).toBeInTheDocument()
    expect(screen.getByText(/PLAZO DE EDICIÓN/i)).toBeInTheDocument()
  })

  it('permite navegar al formulario de edición al hacer clic en Editar encuesta', async () => {
    // Registrar una encuesta reciente (con fecha actual) para que esté dentro del plazo de 7 días
    await registrarEncuesta({
      codigoTicket: 'TCK-2026-00131',
      usuarioId: DEMO.usuario,
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
