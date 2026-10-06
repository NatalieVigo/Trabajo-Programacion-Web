import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { habilitacionesRepository } from '../../repositories/catalogo.repository.js'
import { readTable, writeTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const tabla = () => screen.getByRole('table', { name: 'Categorías habilitadas por técnico' })
const casilla = (tecnico, categoria) =>
  within(tabla()).getByRole('checkbox', { name: `Habilitar a ${tecnico} en ${categoria}` })
const fila = (tecnico) => within(tabla()).getByRole('rowheader', { name: tecnico }).closest('tr')
const habilitadasDe = (tecnicoId) =>
  habilitacionesRepository
    .findAll({ tecnicoId })
    .map(({ categoriaId }) => categoriaId)
    .sort()

/** Abre la matriz con la sesión de Lucía y espera la tabla y el contador de la cabecera. */
async function renderMatriz() {
  const view = renderApp('/supervisor/tecnicos', { usuario: DEMO.supervisor })
  await screen.findByRole('table', { name: 'Categorías habilitadas por técnico' })
  await screen.findByText('Cola sin asignar')
  return view
}

describe('TecnicosCategoriaPage', () => {
  it('muestra a cada técnico con su especialidad declarada, su carga y sus habilitaciones', async () => {
    await renderMatriz()

    expect(screen.getByRole('heading', { level: 1, name: 'Técnicos por categoría' })).toBeInTheDocument()
    expect(within(tabla()).getAllByRole('rowheader').map((celda) => celda.textContent)).toEqual([
      'Iván Zegarra Pinto',
      'Julio Paredes Soto',
      'Marco Huamán Vela',
      'Sandra Nolasco Ríos',
    ])
    expect(within(tabla()).getAllByRole('columnheader').map((celda) => celda.textContent)).toEqual([
      'Técnico',
      'Especialidad declarada',
      'Carga actual',
      'AccesosAccesos y cerraduras',
      'AudiovisualesAudiovisuales',
      'ClimatizaciónClimatización',
      'EléctricoEléctrico',
      'LimpiezaLimpieza',
      'MobiliarioMobiliario',
      'RedesRedes y conectividad',
    ])
    const celdasDeJulio = within(fila('Julio Paredes Soto')).getAllByRole('cell')
    expect(celdasDeJulio[0]).toHaveTextContent('Audiovisuales, Redes y conectividad')
    expect(celdasDeJulio[1]).toHaveTextContent('2 tickets')
    expect(casilla('Julio Paredes Soto', 'Accesos y cerraduras')).toBeChecked()
    expect(casilla('Julio Paredes Soto', 'Climatización')).not.toBeChecked()
    expect(screen.getByText('Ningún técnico está habilitado para atender Limpieza.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar matriz' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Invitar técnico' })).toHaveAttribute('href', '/supervisor/invitaciones')
    expect(document.title).toBe('Técnicos por categoría · Mesa de Ayuda')
  })

  it('guarda solo los técnicos que cambiaron y lo notifica', async () => {
    const { user } = await renderMatriz()

    await user.click(casilla('Julio Paredes Soto', 'Limpieza'))
    await user.click(casilla('Sandra Nolasco Ríos', 'Redes y conectividad'))

    expect(screen.getByText('Cambios sin guardar en 2 técnicos.')).toBeInTheDocument()
    expect(screen.queryByText('Ningún técnico está habilitado para atender Limpieza.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar matriz' }))

    expect(await screen.findByText('Se guardaron las habilitaciones de 2 técnicos.')).toBeInTheDocument()
    expect(habilitadasDe(DEMO.tecnico)).toEqual(['cat-01', 'cat-02', 'cat-06', 'cat-07'])
    expect(habilitadasDe('usr-010')).toEqual(['cat-03'])
    expect(screen.getByRole('button', { name: 'Guardar matriz' })).toBeDisabled()
    expect(screen.queryByText(/Cambios sin guardar/)).not.toBeInTheDocument()
  })

  it('avisa mientras se marca si una categoría se queda sin técnicos', async () => {
    const { user } = await renderMatriz()

    await user.click(casilla('Sandra Nolasco Ríos', 'Climatización'))

    expect(screen.getByText('Ningún técnico está habilitado para atender Climatización.')).toBeInTheDocument()
  })

  it('descarta los cambios tras confirmar', async () => {
    const { user } = await renderMatriz()

    await user.click(casilla('Marco Huamán Vela', 'Audiovisuales'))
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Descartar' }))

    expect(casilla('Marco Huamán Vela', 'Audiovisuales')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Guardar matriz' })).toBeDisabled()
    expect(habilitadasDe('usr-008')).toEqual(['cat-01', 'cat-05'])
  })

  it('sin técnicos activos invita a registrar uno', async () => {
    writeTable('habilitaciones', [])
    writeTable(
      'usuarios',
      readTable('usuarios').filter(({ rol }) => rol !== 'tecnico'),
    )
    const { user } = renderApp('/supervisor/tecnicos', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { name: 'Aún no hay técnicos activos' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: 'Invitar técnico' })[0])
    expect(ubicacionActual()).toBe('/supervisor/invitaciones')
  })

  it('un usuario ve el acceso denegado', async () => {
    renderApp('/supervisor/tecnicos', { usuario: DEMO.usuario })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para ver los técnicos por categoría' }),
    ).toBeInTheDocument()
  })
})
