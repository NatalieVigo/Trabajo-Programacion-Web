import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }
const deOtroIntegrante = (historia) => `Esta sección corresponde a la ${historia} y la implementa otro integrante del equipo.`

async function renderSeccion(ruta, rol) {
  const view = renderApp(ruta, { usuario: DEMO[rol] })
  await screen.findByText(PILDORA[rol])
  return view
}

describe('PlaceholderPage', () => {
  it.each([
    ['/usuario/tickets/nuevo', 'usuario', 'Nuevo ticket', deOtroIntegrante('HU-3 (Registro de tickets)')],
    ['/usuario/tickets', 'usuario', 'Mis tickets', deOtroIntegrante('HU-3 (Registro de tickets)')],
  ])('%s indica que la sección pendiente corresponde a su historia', async (ruta, rol, titulo, descripcion) => {
    await renderSeccion(ruta, rol)

    const contenido = screen.getByRole('main')
    expect(within(contenido).getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(within(contenido).getByRole('heading', { level: 2, name: 'Sección en construcción' })).toBeInTheDocument()
    expect(within(contenido).getByText(descripcion)).toBeInTheDocument()
    expect(document.title).toBe(`${titulo} · Mesa de Ayuda`)
  })

  it('ofrece volver a la vista principal del rol', async () => {
    const { user } = await renderSeccion('/usuario/tickets/nuevo', 'usuario')

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Ir a Mis tickets' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument()
  })

  it('sin código buscado no muestra el aviso de búsqueda', async () => {
    await renderSeccion('/usuario/tickets?codigo=%20%20', 'usuario')

    expect(screen.queryByText(/^Buscaste el código/)).not.toBeInTheDocument()
  })
})
