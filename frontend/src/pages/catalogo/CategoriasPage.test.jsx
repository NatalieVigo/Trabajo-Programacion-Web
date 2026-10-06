import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriasRepository, subcategoriasRepository } from '../../repositories/catalogo.repository.js'
import { readTable, writeTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const tabla = () => screen.getByRole('table', { name: 'Catálogo de servicios' })
const nombresEnLaTabla = () => within(tabla()).getAllByRole('rowheader').map((celda) => celda.textContent)
const fila = (nombre) => within(tabla()).getByRole('rowheader', { name: nombre }).closest('tr')
const celdas = (nombre) =>
  within(fila(nombre))
    .getAllByRole('cell')
    .map((celda) => celda.textContent)
const sub = (nombre, categoria) => `${nombre} (subcategoría de ${categoria})`

/** Abre el catálogo con la sesión de Lucía y espera la tabla y el contador de la cabecera. */
async function renderCatalogo() {
  const view = renderApp('/supervisor/categorias', { usuario: DEMO.supervisor })
  await screen.findByRole('table', { name: 'Catálogo de servicios' })
  await screen.findByText('Cola sin asignar')
  return view
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CategoriasPage · lista', () => {
  it('muestra el árbol de categorías con su prioridad, tiempo esperado, tickets en curso y estado', async () => {
    await renderCatalogo()

    expect(screen.getByRole('heading', { level: 1, name: 'Categorías de servicio' })).toBeInTheDocument()
    expect(
      screen.getByText('7 categorías activas · 20 subcategorías · la prioridad por defecto se aplica a cada ticket nuevo.'),
    ).toBeInTheDocument()
    expect(nombresEnLaTabla().slice(0, 4)).toEqual([
      'Accesos y cerraduras',
      sub('Chapa trabada', 'Accesos y cerraduras'),
      sub('Control de acceso sin respuesta', 'Accesos y cerraduras'),
      'Audiovisuales',
    ])
    expect(celdas('Audiovisuales').slice(0, 4)).toEqual(['Alta', '4 h hábiles', '2', 'Activa'])
    expect(celdas(sub('Proyector no enciende', 'Audiovisuales')).slice(0, 4)).toEqual([
      'Crítica',
      '2 h hábiles',
      '0',
      'Activa',
    ])
    expect(celdas(sub('Calefacción sin funcionar', 'Climatización'))[3]).toBe('Inactiva')
    expect(screen.getByText('7 categorías y 20 subcategorías')).toBeInTheDocument()

    const menu = screen.getByRole('navigation', { name: 'Supervisión' })
    expect(within(menu).getByRole('link', { name: 'Categorías' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Categorías de servicio · Mesa de Ayuda')
  })

  it('ofrece editar todo y eliminar solo lo que no se usa', async () => {
    await renderCatalogo()

    expect(within(fila('Audiovisuales')).getByRole('link', { name: 'Editar Audiovisuales' })).toHaveAttribute(
      'href',
      '/supervisor/categorias/cat-01/editar',
    )
    expect(within(fila('Audiovisuales')).queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
    expect(
      within(fila(sub('Audio sin señal', 'Audiovisuales'))).getByRole('button', { name: 'Eliminar Audio sin señal' }),
    ).toBeInTheDocument()
  })

  it('lleva al formulario para crear una categoría', async () => {
    const { user } = await renderCatalogo()

    await user.click(screen.getByRole('link', { name: 'Nueva categoría' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Nueva categoría' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/supervisor/categorias/nueva')
  })

  it('muestra el estado vacío cuando el catálogo no tiene categorías', async () => {
    writeTable('categorias', [])
    writeTable('subcategorias', [])
    renderApp('/supervisor/categorias', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { name: 'Aún no hay categorías de servicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear primera categoría' })).toHaveAttribute(
      'href',
      '/supervisor/categorias/nueva',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ofrece reintentar si el catálogo no se pudo cargar', async () => {
    vi.spyOn(categoriasRepository, 'findAll').mockImplementationOnce(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/supervisor/categorias', { usuario: DEMO.supervisor })

    expect(await screen.findByText('No pudimos cargar el catálogo de servicios.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('table', { name: 'Catálogo de servicios' })).toBeInTheDocument()
  })

  it('un usuario sin rol de supervisor ve el acceso denegado', async () => {
    renderApp('/supervisor/categorias', { usuario: DEMO.usuario })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para ver las categorías de servicio' }),
    ).toBeInTheDocument()
  })
})

describe('CategoriasPage · eliminar', () => {
  it('elimina una subcategoría tras confirmar y actualiza el resumen', async () => {
    const { user } = await renderCatalogo()
    const calefaccion = sub('Calefacción sin funcionar', 'Climatización')

    await user.click(within(fila(calefaccion)).getByRole('button', { name: 'Eliminar Calefacción sin funcionar' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Eliminar la subcategoría?' })
    expect(confirmacion).toHaveTextContent('«Calefacción sin funcionar» se quitará del catálogo. Esta acción no se puede deshacer.')
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar subcategoría' }))

    expect(await screen.findByText('Subcategoría “Calefacción sin funcionar” eliminada correctamente.')).toBeInTheDocument()
    expect(within(tabla()).queryByRole('rowheader', { name: calefaccion })).not.toBeInTheDocument()
    expect(screen.getByText('7 categorías y 19 subcategorías')).toBeInTheDocument()
    expect(subcategoriasRepository.findById('sub-10')).toBeNull()
    expect(tabla()).toHaveFocus()
  })

  it('no elimina nada si se cancela la confirmación', async () => {
    const { user } = await renderCatalogo()

    await user.click(screen.getByRole('button', { name: 'Eliminar Silla rota' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Eliminar la subcategoría?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fila(sub('Silla rota', 'Mobiliario'))).toBeInTheDocument()
    expect(readTable('subcategorias')).toHaveLength(20)
  })

  it('si la categoría empezó a usarse mientras tanto, explica por qué no se eliminó y actualiza la tabla', async () => {
    writeTable(
      'subcategorias',
      readTable('subcategorias').filter((subcategoria) => subcategoria.categoriaId !== 'cat-06'),
    )
    const { user } = await renderCatalogo()

    await user.click(within(fila('Limpieza')).getByRole('button', { name: 'Eliminar Limpieza' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Eliminar la categoría?' })
    subcategoriasRepository.insert({
      id: 'sub-30',
      categoriaId: 'cat-06',
      nombre: 'Vidrios sucios',
      descripcion: '',
      activa: true,
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
    })
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar categoría' }))

    expect(
      await screen.findByText('No se puede eliminar «Limpieza»: tiene 1 subcategoría. Puedes desactivarla en su lugar.'),
    ).toBeInTheDocument()
    expect(await within(tabla()).findByRole('rowheader', { name: sub('Vidrios sucios', 'Limpieza') })).toBeInTheDocument()
    expect(within(fila('Limpieza')).queryByRole('button', { name: 'Eliminar Limpieza' })).not.toBeInTheDocument()
    expect(categoriasRepository.findById('cat-06')).not.toBeNull()
  })
})

describe('CategoriasPage · estado', () => {
  it('desactiva una categoría sin tickets en curso y lo notifica', async () => {
    const { user } = await renderCatalogo()

    await user.click(within(fila('Limpieza')).getByRole('button', { name: 'Desactivar Limpieza' }))

    expect(await screen.findByText('Categoría “Limpieza” desactivada: ya no admite tickets nuevos.')).toBeInTheDocument()
    expect(celdas('Limpieza')[3]).toBe('Inactiva')
    expect(celdas(sub('Baño sin insumos', 'Limpieza'))[3]).toBe('Activa · categoría inactiva')
    expect(within(fila('Limpieza')).getByRole('button', { name: 'Activar Limpieza' })).toHaveFocus()
    expect(categoriasRepository.findById('cat-06').activa).toBe(false)
    expect(
      screen.getByText('6 categorías activas · 20 subcategorías · la prioridad por defecto se aplica a cada ticket nuevo.'),
    ).toBeInTheDocument()
  })

  it('activa una subcategoría inactiva', async () => {
    const { user } = await renderCatalogo()

    await user.click(screen.getByRole('button', { name: 'Activar Calefacción sin funcionar' }))

    expect(
      await screen.findByText('Subcategoría “Calefacción sin funcionar” activada: vuelve a admitir tickets nuevos.'),
    ).toBeInTheDocument()
    expect(celdas(sub('Calefacción sin funcionar', 'Climatización'))[3]).toBe('Activa')
    expect(subcategoriasRepository.findById('sub-10').activa).toBe(true)
  })

  it('al activar una subcategoría de una categoría inactiva, avisa que aún no admite tickets', async () => {
    categoriasRepository.update('cat-06', { activa: false })
    subcategoriasRepository.update('sub-17', { activa: false })
    const { user } = await renderCatalogo()

    await user.click(screen.getByRole('button', { name: 'Activar Derrame o residuos' }))

    expect(
      await screen.findByText(
        'Subcategoría “Derrame o residuos” activada. Admitirá tickets nuevos cuando «Limpieza» esté activa.',
      ),
    ).toBeInTheDocument()
  })
})
