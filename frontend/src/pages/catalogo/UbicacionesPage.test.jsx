import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ambientesRepository, pabellonesRepository, sedesRepository } from '../../repositories/catalogo.repository.js'
import { writeTable } from '../../repositories/db.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const tabla = () => screen.getByRole('table', { name: 'Ambientes registrados' })
const codigos = () => within(tabla()).getAllByRole('rowheader').map((celda) => celda.textContent)
const fila = (codigo) => within(tabla()).getByRole('rowheader', { name: codigo }).closest('tr')
const celdas = (codigo) =>
  within(fila(codigo))
    .getAllByRole('cell')
    .map((celda) => celda.textContent)
const sede = (nombre) => screen.getByRole('region', { name: nombre })

/** Abre Sedes y ambientes con la sesión de Lucía y espera las pestañas y el contador de la cabecera. */
async function renderUbicaciones(ruta = '/supervisor/ambientes') {
  const view = renderApp(ruta, { usuario: DEMO.supervisor })
  await screen.findByRole('tablist', { name: 'Secciones de sedes y ambientes' })
  await screen.findByText('Cola sin asignar')
  return view
}

async function guardarEnVentana(user, dialogo, boton) {
  await user.click(within(dialogo).getByRole('button', { name: boton }))
}

describe('UbicacionesPage · ambientes', () => {
  it('muestra los ambientes con su ubicación, capacidad y tickets en curso, de 10 en 10', async () => {
    const { user } = await renderUbicaciones()

    expect(screen.getByRole('heading', { level: 1, name: 'Sedes y ambientes' })).toBeInTheDocument()
    expect(screen.getByText('11 ambientes registrados en 1 sede y 9 pabellones.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ambientes 11' })).toHaveAttribute('aria-selected', 'true')
    expect(codigos()).toEqual(['A-201', 'A-305', 'AUD-CEN', 'BIB-P2', 'C-102', 'E-304', 'H-105', 'H-210', 'L-108', 'N-402'])
    expect(celdas('A-201').slice(0, 7)).toEqual(['Aula A-201', 'Aula', 'A', '2', 'Campus Monterrico', '68', '1'])
    expect(screen.getByText('Mostrando 1–10 de 11 ambientes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(codigos()).toEqual(['Q-101'])
    expect(screen.getByText('Mostrando 11–11 de 11 ambientes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    const menu = screen.getByRole('navigation', { name: 'Supervisión' })
    expect(within(menu).getByRole('link', { name: 'Sedes y ambientes' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Sedes y ambientes · Mesa de Ayuda')
  })

  it('filtra por tipo y pabellón, y busca por código o nombre sin distinguir tildes', async () => {
    const { user } = await renderUbicaciones()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Laboratorio')
    expect(codigos()).toEqual(['H-105', 'H-210', 'L-108'])
    await user.selectOptions(screen.getByLabelText('Pabellón'), 'Pabellón H')
    expect(codigos()).toEqual(['H-105', 'H-210'])
    expect(screen.getByText('Mostrando 1–2 de 2 ambientes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(codigos()).toHaveLength(10)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por código o nombre' }), 'computo')
    expect(codigos()).toEqual(['H-105'])

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por código o nombre' }), 'zzz')
    expect(screen.getByRole('heading', { name: 'Ningún ambiente coincide con los filtros' })).toBeInTheDocument()
    expect(screen.getByText('Mostrando 0 de 11 ambientes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver todos los ambientes' }))
    expect(codigos()).toHaveLength(10)
  })

  it('registra un ambiente en la ventana y lo muestra en la lista', async () => {
    const { user } = await renderUbicaciones()

    await user.click(screen.getByRole('button', { name: 'Nuevo ambiente' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo ambiente' })
    expect(within(dialogo).getByLabelText('Código')).toHaveFocus()
    await user.type(within(dialogo).getByLabelText('Código'), 'h-212')
    await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'Laboratorio')
    await user.selectOptions(within(dialogo).getByLabelText('Pabellón'), 'H · Campus Monterrico')
    await user.type(within(dialogo).getByLabelText('Piso'), '2')
    await user.type(within(dialogo).getByLabelText('Capacidad'), '30')
    await guardarEnVentana(user, dialogo, 'Guardar ambiente')

    expect(await screen.findByText('Ambiente “H-212” creado correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Nuevo ambiente' })).not.toBeInTheDocument()
    expect(await screen.findByText('12 ambientes registrados en 1 sede y 9 pabellones.')).toBeInTheDocument()
    expect(celdas('H-212').slice(0, 3)).toEqual(['Laboratorio H-212', 'Laboratorio', 'H'])
    expect(ambientesRepository.findOne({ codigo: 'H-212' })).toMatchObject({ pabellonId: 'pab-04', piso: 2, capacidad: 30 })
  })

  it('señala los errores junto a cada campo de la ventana, incluido un código repetido', async () => {
    const { user } = await renderUbicaciones()

    await user.click(screen.getByRole('button', { name: 'Nuevo ambiente' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo ambiente' })
    await guardarEnVentana(user, dialogo, 'Guardar ambiente')

    expect(within(dialogo).getByText('El código es obligatorio.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Elige el tipo de ambiente.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Elige el pabellón.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Código')).toHaveFocus()

    await user.type(within(dialogo).getByLabelText('Código'), 'A-201')
    await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'Aula')
    await user.selectOptions(within(dialogo).getByLabelText('Pabellón'), 'A · Campus Monterrico')
    await user.type(within(dialogo).getByLabelText('Piso'), '2')
    await user.type(within(dialogo).getByLabelText('Capacidad'), '40')
    await guardarEnVentana(user, dialogo, 'Guardar ambiente')

    expect(await within(dialogo).findByText('Ya existe un ambiente con ese código.')).toBeInTheDocument()
    expect(ambientesRepository.findAll()).toHaveLength(11)
  })

  it('edita un ambiente', async () => {
    const { user } = await renderUbicaciones()

    await user.click(within(fila('A-201')).getByRole('button', { name: 'Editar A-201' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar ambiente A-201' })
    expect(within(dialogo).getByLabelText('Capacidad')).toHaveValue('68')
    await user.clear(within(dialogo).getByLabelText('Capacidad'))
    await user.type(within(dialogo).getByLabelText('Capacidad'), '70')
    await guardarEnVentana(user, dialogo, 'Guardar ambiente')

    expect(await screen.findByText('Ambiente “A-201” actualizado correctamente.')).toBeInTheDocument()
    expect(celdas('A-201')[5]).toBe('70')
  })

  it('cerrar la ventana con datos ingresados pide confirmación', async () => {
    const { user } = await renderUbicaciones()

    await user.click(screen.getByRole('button', { name: 'Nuevo ambiente' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo ambiente' })
    await user.type(within(dialogo).getByLabelText('Código'), 'H-212')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Descartar' }))

    expect(screen.queryByRole('dialog', { name: 'Nuevo ambiente' })).not.toBeInTheDocument()
    expect(ambientesRepository.findAll()).toHaveLength(11)
  })

  it('elimina tras confirmar solo los ambientes que no se usan', async () => {
    const { user } = await renderUbicaciones()

    expect(within(fila('A-201')).queryByRole('button', { name: 'Eliminar A-201' })).not.toBeInTheDocument()
    await user.click(within(fila('C-102')).getByRole('button', { name: 'Eliminar C-102' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Eliminar el ambiente?' })
    expect(confirmacion).toHaveTextContent('«C-102 · Oficina de Bienestar Universitario» se quitará del catálogo.')
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar ambiente' }))

    expect(await screen.findByText('Ambiente “C-102” eliminado correctamente.')).toBeInTheDocument()
    expect(within(tabla()).queryByRole('rowheader', { name: 'C-102' })).not.toBeInTheDocument()
    expect(ambientesRepository.findById('amb-11')).toBeNull()
    expect(tabla()).toHaveFocus()
  })

  it('sin pabellones no se pueden crear ambientes y lleva a registrar uno', async () => {
    writeTable('ambientes', [])
    writeTable('pabellones', [])
    const { user } = await renderUbicaciones()

    expect(screen.getByRole('button', { name: 'Nuevo ambiente' })).toBeDisabled()
    expect(screen.getByText('Primero registra una sede y un pabellón en «Sedes y pabellones».')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir a sedes y pabellones' }))

    expect(screen.getByRole('tab', { name: 'Sedes y pabellones 1' })).toHaveAttribute('aria-selected', 'true')
    expect(ubicacionActual()).toBe('/supervisor/ambientes?vista=sedes')
  })

  it('un técnico ve el acceso denegado', async () => {
    renderApp('/supervisor/ambientes', { usuario: DEMO.tecnico })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para ver las sedes y ambientes' }),
    ).toBeInTheDocument()
  })
})

describe('UbicacionesPage · sedes y pabellones', () => {
  it('muestra cada sede con sus pabellones y se elige desde la pestaña o la dirección', async () => {
    const { user } = await renderUbicaciones()

    await user.click(screen.getByRole('tab', { name: 'Sedes y pabellones 1' }))

    expect(ubicacionActual()).toBe('/supervisor/ambientes?vista=sedes')
    expect(screen.getByRole('button', { name: 'Nueva sede' })).toBeInTheDocument()
    expect(within(sede('Campus Monterrico')).getByText('9 pabellones · 11 ambientes')).toBeInTheDocument()
    const pabellones = within(sede('Campus Monterrico')).getByRole('list', { name: 'Pabellones de Campus Monterrico' })
    expect(within(pabellones).getAllByRole('listitem')[0]).toHaveTextContent('Pabellón A2 ambientes')
    expect(within(sede('Campus Monterrico')).queryByRole('button', { name: 'Eliminar Campus Monterrico' })).not.toBeInTheDocument()
  })

  it('las flechas del teclado cambian de pestaña', async () => {
    const { user } = await renderUbicaciones('/supervisor/ambientes?vista=sedes')

    const sedes = screen.getByRole('tab', { name: 'Sedes y pabellones 1' })
    expect(sedes).toHaveAttribute('aria-selected', 'true')
    sedes.focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Ambientes 11' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Ambientes 11' })).toHaveAttribute('aria-selected', 'true')
    expect(ubicacionActual()).toBe('/supervisor/ambientes')
  })

  it('registra una sede con un pabellón y luego los elimina', async () => {
    const { user } = await renderUbicaciones('/supervisor/ambientes?vista=sedes')

    await user.click(screen.getByRole('button', { name: 'Nueva sede' }))
    const nuevaSede = await screen.findByRole('dialog', { name: 'Nueva sede' })
    await user.type(within(nuevaSede).getByLabelText('Nombre'), 'Campus San Isidro')
    await guardarEnVentana(user, nuevaSede, 'Guardar sede')

    expect(await screen.findByText('Sede “Campus San Isidro” creada correctamente.')).toBeInTheDocument()
    const sanIsidro = await screen.findByRole('region', { name: 'Campus San Isidro' })
    expect(within(sanIsidro).getByText('Aún no tiene pabellones.')).toBeInTheDocument()

    await user.click(within(sanIsidro).getByRole('button', { name: 'Nuevo pabellón en Campus San Isidro' }))
    const nuevoPabellon = await screen.findByRole('dialog', { name: 'Nuevo pabellón' })
    expect(within(nuevoPabellon).getByLabelText('Sede')).toHaveValue('sed-02')
    await user.type(within(nuevoPabellon).getByLabelText('Nombre'), 'J')
    await guardarEnVentana(user, nuevoPabellon, 'Guardar pabellón')

    expect(await screen.findByText('Pabellón “J” creado correctamente.')).toBeInTheDocument()
    expect(within(sede('Campus San Isidro')).queryByRole('button', { name: 'Eliminar Campus San Isidro' })).not.toBeInTheDocument()

    await user.click(within(sede('Campus San Isidro')).getByRole('button', { name: 'Eliminar pabellón J' }))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Eliminar el pabellón?' })).getByRole('button', {
        name: 'Eliminar pabellón',
      }),
    )
    expect(await screen.findByText('Pabellón “J” eliminado correctamente.')).toBeInTheDocument()
    expect(pabellonesRepository.findAll({ sedeId: 'sed-02' })).toEqual([])

    await user.click(await within(sede('Campus San Isidro')).findByRole('button', { name: 'Eliminar Campus San Isidro' }))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Eliminar la sede?' })).getByRole('button', {
        name: 'Eliminar sede',
      }),
    )
    expect(await screen.findByText('Sede “Campus San Isidro” eliminada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Campus San Isidro' })).not.toBeInTheDocument()
    expect(sedesRepository.findById('sed-02')).toBeNull()
  })

  it('no repite el nombre de un pabellón en su sede', async () => {
    const { user } = await renderUbicaciones('/supervisor/ambientes?vista=sedes')

    await user.click(screen.getByRole('button', { name: 'Nuevo pabellón en Campus Monterrico' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo pabellón' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'h')
    await guardarEnVentana(user, dialogo, 'Guardar pabellón')

    expect(await within(dialogo).findByText('Esta sede ya tiene un pabellón con ese nombre.')).toBeInTheDocument()
    expect(pabellonesRepository.findAll()).toHaveLength(9)
  })
})
