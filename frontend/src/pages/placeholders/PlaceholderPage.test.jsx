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
    ['/usuario/encuestas/pendiente', 'usuario', 'Encuesta pendiente', deOtroIntegrante('HU-6 (Encuesta de satisfacción)')],
    ['/usuario/encuestas', 'usuario', 'Mis encuestas', deOtroIntegrante('HU-6 (Encuesta de satisfacción)')],
    ['/tecnico/historial', 'tecnico', 'Historial', deOtroIntegrante('HU-5 (Atención y cierre)')],
    ['/supervisor/cola', 'supervisor', 'Cola de atención', deOtroIntegrante('HU-4 (Cola y asignación)')],
    ['/supervisor/categorias', 'supervisor', 'Categorías de servicio', deOtroIntegrante('HU-2 (Catálogo de servicios)')],
    ['/supervisor/ambientes', 'supervisor', 'Sedes y ambientes', deOtroIntegrante('HU-2 (Catálogo de servicios)')],
    ['/supervisor/tecnicos', 'supervisor', 'Técnicos por categoría', deOtroIntegrante('HU-2 (Catálogo de servicios)')],
    ['/supervisor/usuarios', 'supervisor', 'Usuarios', deOtroIntegrante('HU-7 (Métricas y usuarios)')],
  ])('%s indica que la sección pendiente corresponde a su historia', async (ruta, rol, titulo, descripcion) => {
    await renderSeccion(ruta, rol)

    const contenido = screen.getByRole('main')
    expect(within(contenido).getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(within(contenido).getByRole('heading', { level: 2, name: 'Sección en construcción' })).toBeInTheDocument()
    expect(within(contenido).getByText(descripcion)).toBeInTheDocument()
    expect(document.title).toBe(`${titulo} · Mesa de Ayuda`)
  })

  it('ofrece volver a la vista principal del rol', async () => {
    const { user } = await renderSeccion('/supervisor/cola', 'supervisor')

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Ir a Tablero' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Tablero' })).toBeInTheDocument()
  })

  it('las vistas principales del técnico y del supervisor dan la bienvenida sin enlace a sí mismas', async () => {
    const { unmount } = await renderSeccion('/tecnico', 'tecnico')
    expect(
      screen.getByText('Te damos la bienvenida, Julio. Aquí verás los tickets que te asignen y su avance.'),
    ).toBeInTheDocument()
    expect(screen.getByText(deOtroIntegrante('HU-4 (Cola y asignación)'))).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link')).not.toBeInTheDocument()
    unmount()

    await renderSeccion('/supervisor', 'supervisor')
    expect(screen.getByText('Te damos la bienvenida, Lucía. Aquí verás las métricas de atención del área.')).toBeInTheDocument()
    expect(screen.getByText(deOtroIntegrante('HU-7 (Métricas y usuarios)'))).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link')).not.toBeInTheDocument()
  })

  it('sin código buscado no muestra el aviso de búsqueda', async () => {
    await renderSeccion('/usuario/tickets?codigo=%20%20', 'usuario')

    expect(screen.queryByText(/^Buscaste el código/)).not.toBeInTheDocument()
  })
})
