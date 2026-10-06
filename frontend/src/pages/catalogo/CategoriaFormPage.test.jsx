import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { categoriasRepository, subcategoriasRepository } from '../../repositories/catalogo.repository.js'
import { readTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const campo = (label) => screen.getByLabelText(label)

/** Abre el formulario con la sesión de Lucía y espera a que cargue. */
async function renderFormulario(ruta, titulo) {
  const view = renderApp(ruta, { usuario: DEMO.supervisor })
  await screen.findByRole('heading', { level: 1, name: titulo })
  await screen.findByText('Cola sin asignar')
  return view
}

async function completar(user, { nombre, prioridad, horas, descripcion }) {
  if (nombre) await user.type(campo('Nombre'), nombre)
  if (prioridad) await user.click(screen.getByRole('radio', { name: prioridad }))
  if (horas) await user.type(campo('Tiempo esperado (horas)'), horas)
  if (descripcion) await user.type(campo('Descripción'), descripcion)
}

describe('CategoriaFormPage · nueva', () => {
  it('crea una categoría principal y vuelve al catálogo con el aviso', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    const rutaDeNavegacion = screen.getByRole('navigation', { name: 'Ruta de navegación' })
    expect(within(rutaDeNavegacion).getByRole('link', { name: 'Categorías' })).toHaveAttribute(
      'href',
      '/supervisor/categorias',
    )
    expect(campo('Categoría padre')).toHaveValue('')
    expect(screen.getByText('Déjalo vacío para crear una categoría de primer nivel.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Categoría activa · disponible al registrar tickets' })).toBeChecked()
    expect(screen.getByText('Crítica 2 h · Alta 8 h · Media 24 h · Baja 72 h hábiles')).toBeInTheDocument()

    await completar(user, { nombre: 'Señalética', prioridad: 'Baja', horas: '48', descripcion: 'Letreros dañados.' })
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    expect(await screen.findByText('Categoría “Señalética” creada correctamente.')).toBeInTheDocument()
    // El router navega en una transición: la dirección cambia cuando la lista ya se muestra.
    expect(await screen.findByRole('rowheader', { name: 'Señalética' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/supervisor/categorias')
    expect(categoriasRepository.findOne({ nombre: 'Señalética' })).toMatchObject({
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
      descripcion: 'Letreros dañados.',
      activa: true,
    })
  })

  it('con una categoría padre crea una subcategoría', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    await user.selectOptions(campo('Categoría padre'), 'Audiovisuales')

    expect(screen.getByRole('heading', { level: 1, name: 'Nueva subcategoría' })).toBeInTheDocument()
    expect(document.title).toBe('Nueva subcategoría · Mesa de Ayuda')
    expect(screen.getByRole('checkbox', { name: 'Subcategoría activa · disponible al registrar tickets' })).toBeChecked()

    await completar(user, { nombre: 'Cable HDMI', prioridad: 'Alta', horas: '4' })
    await user.click(screen.getByRole('button', { name: 'Guardar subcategoría' }))

    expect(await screen.findByText('Subcategoría “Cable HDMI” creada correctamente.')).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'Cable HDMI (subcategoría de Audiovisuales)' })).toBeInTheDocument()
    expect(subcategoriasRepository.findOne({ nombre: 'Cable HDMI' })).toMatchObject({ categoriaId: 'cat-01' })
  })

  it('resume los campos por revisar y muestra cada error junto a su campo (p13)', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    await user.selectOptions(campo('Categoría padre'), 'Audiovisuales')
    await completar(user, { prioridad: 'Crítica', horas: '0' })
    await user.click(screen.getByRole('button', { name: 'Guardar subcategoría' }))

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar: revisa los 2 campos marcados.')
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Debe ser un número mayor que cero.')).toBeInTheDocument()
    expect(campo('Nombre')).toHaveFocus()
    expect(campo('Nombre')).toHaveAttribute('aria-invalid', 'true')

    await user.type(campo('Nombre'), 'Extensor HDMI')
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar: revisa el campo marcado.')
    expect(readTable('subcategorias')).toHaveLength(20)
  })

  it('avisa junto al nombre si ya existe una categoría con ese nombre', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    await completar(user, { nombre: 'climatizacion', prioridad: 'Media', horas: '24' })
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    expect(await screen.findByText('Ya existe una categoría con ese nombre.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar: revisa el campo marcado.')
    expect(campo('Nombre')).toHaveFocus()
    expect(readTable('categorias')).toHaveLength(7)
  })

  it('pide confirmación para cancelar con datos ingresados', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    await user.type(campo('Nombre'), 'Jardinería')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Seguir editando' }))
    expect(campo('Nombre')).toHaveValue('Jardinería')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })).getByRole('button', {
        name: 'Descartar',
      }),
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Categorías de servicio' })).toBeInTheDocument()
    expect(readTable('categorias')).toHaveLength(7)
  })

  it('sin cambios, cancelar vuelve al catálogo sin preguntar', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/nueva', 'Nueva categoría')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Categorías de servicio' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('CategoriaFormPage · editar', () => {
  it('edita una categoría, que no puede pasar a ser subcategoría', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/cat-03/editar', 'Editar categoría')

    expect(campo('Nombre')).toHaveValue('Climatización')
    expect(campo('Tiempo esperado (horas)')).toHaveValue('8')
    expect(screen.getByRole('radio', { name: 'Alta' })).toBeChecked()
    expect(campo('Categoría padre')).toBeDisabled()
    expect(screen.getByText('Una categoría principal no puede pasar a ser subcategoría.')).toBeInTheDocument()

    await user.clear(campo('Tiempo esperado (horas)'))
    await user.type(campo('Tiempo esperado (horas)'), '12')
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    expect(await screen.findByText('Categoría “Climatización” actualizada correctamente.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Categorías de servicio' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/supervisor/categorias')
    expect(categoriasRepository.findById('cat-03').tiempoEsperadoHoras).toBe(12)
  })

  it('edita una subcategoría y la mueve a otra categoría', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/sub-12/editar', 'Editar subcategoría')

    expect(campo('Categoría padre')).toHaveValue('cat-04')
    expect(within(campo('Categoría padre')).queryByRole('option', { name: /Ninguna/ })).not.toBeInTheDocument()

    await user.selectOptions(campo('Categoría padre'), 'Mobiliario')
    await user.click(screen.getByRole('button', { name: 'Guardar subcategoría' }))

    expect(await screen.findByText('Subcategoría “Luminaria apagada” actualizada correctamente.')).toBeInTheDocument()
    expect(subcategoriasRepository.findById('sub-12').categoriaId).toBe('cat-05')
  })

  it('llega desde «Editar» del catálogo', async () => {
    const { user } = renderApp('/supervisor/categorias', { usuario: DEMO.supervisor })

    await user.click(await screen.findByRole('link', { name: 'Editar Audiovisuales' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar categoría' })).toBeInTheDocument()
    expect(campo('Nombre')).toHaveValue('Audiovisuales')
  })

  it('una categoría que no existe muestra un 404 con el camino de vuelta', async () => {
    renderApp('/supervisor/categorias/cat-99/editar', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta categoría' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las categorías' })).toHaveAttribute('href', '/supervisor/categorias')
  })
})

describe('CategoriaFormPage · desactivar con tickets en curso', () => {
  it('pide la confirmación explícita antes de guardar la categoría inactiva', async () => {
    const { user } = await renderFormulario('/supervisor/categorias/cat-01/editar', 'Editar categoría')

    await user.click(screen.getByRole('checkbox', { name: 'Categoría activa · disponible al registrar tickets' }))
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }))
    let confirmacion = await screen.findByRole('alertdialog', { name: '¿Desactivar la categoría?' })
    expect(confirmacion).toHaveTextContent('«Audiovisuales» tiene 2 tickets en curso.')
    await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Editar categoría' })).toBeInTheDocument()
    expect(categoriasRepository.findById('cat-01').activa).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }))
    confirmacion = await screen.findByRole('alertdialog', { name: '¿Desactivar la categoría?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Desactivar categoría' }))

    expect(await screen.findByText('Categoría “Audiovisuales” actualizada correctamente.')).toBeInTheDocument()
    expect(categoriasRepository.findById('cat-01').activa).toBe(false)
  })
})
