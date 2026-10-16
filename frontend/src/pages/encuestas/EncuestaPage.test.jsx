import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../repositories/db.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

describe('EncuestaPage (Vista 6.1)', () => {
  beforeEach(() => {
    resetDb()
  })

  it('renderiza el formulario de encuesta y el resumen del ticket a evaluar', async () => {
    renderApp('/usuario/encuestas/TCK-2026-00130/evaluar', { usuario: DEMO.usuario })

    expect(await screen.findByText('¿Cómo fue la atención de tu ticket?')).toBeInTheDocument()
    expect(screen.getByText('PUNTAJE GENERAL')).toBeInTheDocument()
    expect(screen.getByText('CALIFICACIÓN POR ASPECTOS')).toBeInTheDocument()
    expect(screen.getByText('COMENTARIO (OPCIONAL)')).toBeInTheDocument()
    expect(screen.getByText('Ticket evaluado')).toBeInTheDocument()
    expect(screen.getByText('TCK-2026-00130')).toBeInTheDocument()
  })

  it('permite calificar un ticket pendiente y enviar la encuesta', async () => {
    const { user } = renderApp('/usuario/encuestas/TCK-2026-00131/evaluar', { usuario: DEMO.usuario })

    expect(await screen.findByText('¿Cómo fue la atención de tu ticket?')).toBeInTheDocument()

    const boton5 = screen.getAllByRole('button', { name: '5' })[0]
    await user.click(boton5)

    const inputComentario = screen.getByLabelText(/COMENTARIO/i)
    await user.clear(inputComentario)
    await user.type(inputComentario, 'Muy buen servicio y rápido.')

    const botonEnviar = screen.getByRole('button', { name: 'Enviar encuesta' })
    await user.click(botonEnviar)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Mis encuestas' })).toBeInTheDocument()
    })
  })
})
