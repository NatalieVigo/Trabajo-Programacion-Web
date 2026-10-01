import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ambientesRepository } from '../../repositories/catalogo.repository.js'
import { readTable, writeTable } from '../../repositories/db.js'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'
import { verifyPassword } from '../../utils/password.js'

const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }
const NUEVA = 'Campus2027!'

const formulario = () => screen.getByRole('form', { name: 'Datos personales' })
const campo = (etiqueta) => within(formulario()).getByLabelText(etiqueta)
const botonGuardar = () => screen.getByRole('button', { name: 'Guardar cambios' })
const formularioContrasena = () => screen.getByRole('form', { name: 'Cambiar contraseña' })
const campoContrasena = (etiqueta) => within(formularioContrasena()).getByLabelText(etiqueta)
const botonActualizar = () => screen.getByRole('button', { name: 'Actualizar contraseña' })
const tieneLaContrasena = (usuarioId, password) => {
  const { passwordSalt, passwordHash } = usuariosRepository.findById(usuarioId)
  return verifyPassword(password, passwordSalt, passwordHash)
}
const resumen = () => screen.getByRole('complementary', { name: 'Resumen de tu cuenta' })
const filasDelResumen = () =>
  within(resumen())
    .getAllByRole('term')
    .map((termino) => [termino.textContent, termino.nextElementSibling.textContent])

/** Abre Mi cuenta con la sesión de `cuenta` (un id del seed) y espera el formulario, el resumen y la cabecera. */
async function abrirMiCuenta(cuenta = DEMO.usuario, rol = 'usuario') {
  const view = renderApp('/mi-cuenta', { usuario: cuenta })
  await screen.findByRole('form', { name: 'Datos personales' })
  await within(resumen()).findAllByRole('term')
  await screen.findByText(PILDORA[rol])
  return view
}

async function reemplazar(user, etiqueta, texto) {
  await user.clear(campo(etiqueta))
  await user.type(campo(etiqueta), texto)
}

async function completarCambio(user, { actual, nueva, confirmacion = nueva }) {
  await user.type(campoContrasena('Actual'), actual)
  await user.type(campoContrasena('Nueva'), nueva)
  await user.type(campoContrasena('Confirmar'), confirmacion)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime('2026-10-01T15:00:00.000Z')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AccountPage · datos de la cuenta', () => {
  it('muestra los datos personales, el perfil con su resumen y la encuesta pendiente del usuario (p10)', async () => {
    await abrirMiCuenta()

    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Tus datos se usan para contactarte durante la atención de un ticket.')).toBeInTheDocument()
    expect(document.title).toBe('Mi cuenta · Mesa de Ayuda')

    expect(campo('Nombres')).toHaveValue('Camila Alejandra')
    expect(campo('Apellidos')).toHaveValue('Quispe Ramos')
    expect(campo('Teléfono')).toHaveValue('987 654 321')
    expect(campo('Unidad o carrera')).toHaveValue('Ingeniería de Sistemas')
    expect(within(campo('Ambiente habitual')).getByRole('option', { selected: true })).toHaveTextContent(
      'A-201 · Aula A-201',
    )
    expect(within(formulario()).queryByText('Especialidades')).not.toBeInTheDocument()

    expect(within(resumen()).getByRole('heading', { name: 'Camila Alejandra Quispe Ramos' })).toBeInTheDocument()
    expect(within(resumen()).getByText('Usuario · estudiante')).toBeInTheDocument()
    expect(filasDelResumen()).toEqual([
      ['Tickets reportados', '12'],
      ['Abiertos ahora', '3'],
      ['Cuenta creada', '14/03/2026'],
    ])

    const encuesta = within(resumen()).getByRole('region', { name: 'Encuesta pendiente' })
    expect(encuesta).toHaveTextContent(
      'El ticket TCK-2026-00131 se cerró el 28/09/2026. Califica la atención antes del 05/10/2026.',
    )
    expect(within(encuesta).getByText('TCK-2026-00131')).toHaveClass('text-mono')
    expect(within(encuesta).getByRole('link', { name: 'Responder encuesta' })).toHaveAttribute(
      'href',
      '/usuario/encuestas/pendiente',
    )
  })

  it('el correo institucional es de solo lectura', async () => {
    const { user } = await abrirMiCuenta()
    const correo = campo('Correo institucional')

    expect(correo).toHaveValue('camila.quispe@aloe.ulima.edu.pe')
    expect(correo).toHaveAttribute('readonly')
    expect(correo).toHaveAccessibleDescription('No editable.')

    await user.type(correo, 'x')
    expect(correo).toHaveValue('camila.quispe@aloe.ulima.edu.pe')
    expect(botonGuardar()).toBeDisabled()
  })

  it('un usuario sin encuestas por responder ve el estado vacío', async () => {
    await abrirMiCuenta(DEMO.sinTickets)

    expect(within(resumen()).getByText('Usuario · docente')).toBeInTheDocument()
    expect(filasDelResumen()).toEqual([
      ['Tickets reportados', '0'],
      ['Abiertos ahora', '0'],
      ['Cuenta creada', '08/04/2026'],
    ])
    expect(within(resumen()).getByRole('heading', { name: 'No tienes encuestas pendientes.' })).toBeInTheDocument()
    expect(within(resumen()).queryByRole('link', { name: 'Responder encuesta' })).not.toBeInTheDocument()
    expect(campo('Ambiente habitual')).toHaveValue('')
    expect(within(campo('Ambiente habitual')).getByRole('option', { selected: true })).toHaveTextContent(
      'Sin ambiente habitual',
    )
  })

  it('el técnico ve sus especialidades sin poder editarlas y el resumen de su atención', async () => {
    await abrirMiCuenta(DEMO.tecnico, 'tecnico')

    const especialidades = within(formulario()).getByRole('list', { name: 'Especialidades' })
    expect(within(especialidades).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Audiovisuales',
      'Redes y conectividad',
    ])
    expect(especialidades).toHaveAccessibleDescription('La asignación de categorías la gestiona el supervisor.')
    expect(within(especialidades).queryByRole('button')).not.toBeInTheDocument()
    expect(campo('Unidad o carrera')).toHaveValue('Dirección de Infraestructura y Servicios')

    expect(within(resumen()).getByRole('heading', { name: 'Julio César Paredes Soto' })).toBeInTheDocument()
    expect(within(resumen()).getByText('Técnico')).toBeInTheDocument()
    expect(filasDelResumen()).toEqual([
      ['Tickets asignados', '8'],
      ['En atención', '1'],
      ['Cuenta creada', '02/03/2026'],
    ])
    expect(screen.queryByRole('region', { name: 'Encuesta pendiente' })).not.toBeInTheDocument()
    expect(screen.queryByText('No tienes encuestas pendientes.')).not.toBeInTheDocument()
  })

  it('el supervisor ve sus especialidades y sus invitaciones pendientes', async () => {
    await abrirMiCuenta(DEMO.supervisor, 'supervisor')

    const especialidades = within(formulario()).getByRole('list', { name: 'Especialidades' })
    expect(within(especialidades).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Climatización',
      'Eléctrico',
    ])
    expect(within(resumen()).getByText('Supervisor')).toBeInTheDocument()
    expect(filasDelResumen()).toEqual([
      ['Invitaciones pendientes', '2'],
      ['Cuenta creada', '12/01/2026'],
    ])
  })
})

describe('AccountPage · edición', () => {
  it('«Guardar cambios» solo se habilita mientras hay cambios sin guardar', async () => {
    const { user } = await abrirMiCuenta()
    expect(botonGuardar()).toBeDisabled()

    await user.type(campo('Nombres'), 'x')
    expect(botonGuardar()).toBeEnabled()

    await user.type(campo('Nombres'), '{Backspace}')
    expect(botonGuardar()).toBeDisabled()
  })

  it('guarda los cambios, lo notifica y actualiza el nombre de la cabecera sin recargar', async () => {
    const { user } = await abrirMiCuenta()

    await reemplazar(user, 'Apellidos', 'Quispe   Rojas')
    await reemplazar(user, 'Teléfono', '912345678')
    await user.selectOptions(campo('Ambiente habitual'), 'Sin ambiente habitual')
    await user.click(botonGuardar())

    expect(await screen.findByText('Tus datos se guardaron correctamente.')).toBeInTheDocument()
    expect(await within(screen.getByRole('banner')).findByText('Camila Quispe Rojas')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(campo('Apellidos')).toHaveValue('Quispe Rojas')
    expect(campo('Teléfono')).toHaveValue('912 345 678')
    expect(screen.getByRole('heading', { level: 2, name: 'Datos personales' })).toHaveFocus()
    expect(within(resumen()).getByRole('heading', { name: 'Camila Alejandra Quispe Rojas' })).toBeInTheDocument()
    expect(usuariosRepository.findById(DEMO.usuario)).toMatchObject({
      apellidos: 'Quispe Rojas',
      telefono: '912345678',
      ambienteHabitualId: null,
      correo: 'camila.quispe@aloe.ulima.edu.pe',
    })
  })

  it('«Descartar» pide confirmación y vuelve a los datos guardados', async () => {
    const { user } = await abrirMiCuenta()
    await reemplazar(user, 'Nombres', 'Valeria')
    await user.selectOptions(campo('Unidad o carrera'), 'Arquitectura')

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    const dialogo = screen.getByRole('alertdialog', { name: '¿Descartar los cambios?' })
    expect(dialogo).toHaveAccessibleDescription('Se perderán los cambios que no guardaste.')
    await user.click(within(dialogo).getByRole('button', { name: 'Seguir editando' }))
    expect(campo('Nombres')).toHaveValue('Valeria')

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(campo('Nombres')).toHaveValue('Camila Alejandra')
    expect(campo('Unidad o carrera')).toHaveValue('Ingeniería de Sistemas')
    expect(botonGuardar()).toBeDisabled()
    expect(usuariosRepository.findById(DEMO.usuario).nombres).toBe('Camila Alejandra')
  })

  it('sin cambios, «Descartar» no pide confirmación', async () => {
    const { user } = await abrirMiCuenta()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(campo('Nombres')).toHaveValue('Camila Alejandra')
  })

  it('valida cada dato junto a su campo y no guarda mientras haya errores', async () => {
    const { user } = await abrirMiCuenta()

    await reemplazar(user, 'Teléfono', '812 345 678')
    await user.tab()
    expect(campo('Teléfono')).toHaveAttribute('aria-invalid', 'true')
    expect(campo('Teléfono')).toHaveAccessibleDescription('Ingresa un celular de 9 dígitos que empiece con 9.')

    await user.clear(campo('Nombres'))
    await user.click(botonGuardar())

    expect(campo('Nombres')).toHaveFocus()
    expect(campo('Nombres')).toHaveAccessibleDescription('Ingresa tus nombres.')
    expect(usuariosRepository.findById(DEMO.usuario)).toMatchObject({ nombres: 'Camila Alejandra', telefono: '987654321' })
  })

  it('muestra junto al campo el error que devuelve el servicio y lo enfoca', async () => {
    const { user } = await abrirMiCuenta()
    await user.selectOptions(campo('Ambiente habitual'), 'amb-05')
    // El ambiente deja de existir mientras se completa el formulario.
    writeTable('ambientes', readTable('ambientes').filter((ambiente) => ambiente.id !== 'amb-05'))

    await user.click(botonGuardar())

    expect(await screen.findByText('Selecciona un ambiente de la lista.')).toBeInTheDocument()
    expect(campo('Ambiente habitual')).toHaveAccessibleDescription('Selecciona un ambiente de la lista.')
    expect(campo('Ambiente habitual')).toHaveFocus()
    expect(usuariosRepository.findById(DEMO.usuario).ambienteHabitualId).toBe('amb-01')
  })

  it('si el guardado falla por un error inesperado lo notifica y conserva lo editado', async () => {
    const { user } = await abrirMiCuenta()
    vi.spyOn(usuariosRepository, 'update').mockImplementation(() => {
      throw new Error('Sin conexión')
    })

    await reemplazar(user, 'Nombres', 'Valeria')
    await user.click(botonGuardar())

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(campo('Nombres')).toHaveValue('Valeria')
    expect(botonGuardar()).toBeEnabled()
    expect(within(screen.getByRole('banner')).getByText('Camila Quispe Ramos')).toBeInTheDocument()
  })
})

describe('AccountPage · cambiar contraseña', () => {
  it('muestra la sección debajo de los datos personales, con la actual, la nueva y su confirmación (p10)', async () => {
    await abrirMiCuenta()

    const seccion = screen.getByRole('region', { name: 'Cambiar contraseña' })
    expect(within(seccion).getByRole('heading', { level: 2, name: 'Cambiar contraseña' })).toBeInTheDocument()
    expect(campoContrasena('Actual')).toHaveAttribute('type', 'password')
    expect(campoContrasena('Actual')).toHaveAttribute('autocomplete', 'current-password')
    expect(campoContrasena('Nueva')).toHaveAttribute('autocomplete', 'new-password')
    expect(campoContrasena('Nueva')).toHaveAccessibleDescription('Mínimo 8 caracteres, con una mayúscula y un número.')
    expect(campoContrasena('Confirmar')).toHaveAttribute('type', 'password')
    expect(botonActualizar()).toHaveAttribute('type', 'submit')
    expect(
      screen.getByRole('region', { name: 'Datos personales' }).compareDocumentPosition(seccion) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('si la contraseña actual no es la correcta lo indica junto a ella y no cambia nada', async () => {
    const { user } = await abrirMiCuenta()
    await completarCambio(user, { actual: 'Camila2025', nueva: NUEVA })

    await user.click(botonActualizar())

    await waitFor(() => expect(campoContrasena('Actual')).toHaveFocus())
    expect(campoContrasena('Actual')).toHaveAttribute('aria-invalid', 'true')
    expect(campoContrasena('Actual')).toHaveAccessibleDescription('La contraseña actual no es correcta.')
    expect(campoContrasena('Nueva')).toHaveValue(NUEVA)
    expect(screen.queryByText('Tu contraseña se actualizó correctamente.')).not.toBeInTheDocument()
    await expect(tieneLaContrasena(DEMO.usuario, 'Camila2026')).resolves.toBe(true)

    await user.type(campoContrasena('Actual'), 'x')
    expect(campoContrasena('Actual')).not.toHaveAttribute('aria-invalid')
  })

  it('actualiza la contraseña, lo notifica y deja los campos vacíos', async () => {
    const { user } = await abrirMiCuenta()
    await completarCambio(user, { actual: 'Camila2026', nueva: NUEVA })
    expect(within(formularioContrasena()).getByText('Segura')).toBeInTheDocument()

    await user.click(botonActualizar())

    expect(await screen.findByText('Tu contraseña se actualizó correctamente.')).toBeInTheDocument()
    expect(campoContrasena('Actual')).toHaveValue('')
    expect(campoContrasena('Nueva')).toHaveValue('')
    expect(campoContrasena('Confirmar')).toHaveValue('')
    expect(campoContrasena('Actual')).not.toHaveAttribute('aria-invalid')
    expect(within(formularioContrasena()).queryByText('Segura')).not.toBeInTheDocument()
    await expect(tieneLaContrasena(DEMO.usuario, NUEVA)).resolves.toBe(true)
  })

  it('pide una nueva contraseña distinta de la actual y bien confirmada antes de enviar', async () => {
    const { user } = await abrirMiCuenta()
    await completarCambio(user, { actual: 'Camila2026', nueva: 'Camila2026', confirmacion: 'Camila2027' })

    await user.click(botonActualizar())

    expect(campoContrasena('Nueva')).toHaveFocus()
    expect(campoContrasena('Nueva')).toHaveAccessibleDescription('La nueva contraseña debe ser distinta de la actual.')
    expect(campoContrasena('Confirmar')).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    await expect(tieneLaContrasena(DEMO.usuario, 'Camila2026')).resolves.toBe(true)
  })

  it('el técnico también cambia su contraseña desde Mi cuenta', async () => {
    const { user } = await abrirMiCuenta(DEMO.tecnico, 'tecnico')
    await completarCambio(user, { actual: 'Tecnico2026', nueva: NUEVA })

    await user.click(botonActualizar())

    expect(await screen.findByText('Tu contraseña se actualizó correctamente.')).toBeInTheDocument()
    await expect(tieneLaContrasena(DEMO.tecnico, NUEVA)).resolves.toBe(true)
  })

  it('si el cambio falla de forma inesperada lo notifica y conserva lo escrito', async () => {
    const { user } = await abrirMiCuenta()
    vi.spyOn(usuariosRepository, 'update').mockImplementation(() => {
      throw new Error('Sin conexión')
    })
    await completarCambio(user, { actual: 'Camila2026', nueva: NUEVA })

    await user.click(botonActualizar())

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(campoContrasena('Nueva')).toHaveValue(NUEVA)
    expect(botonActualizar()).toBeEnabled()
  })
})

describe('AccountPage · carga', () => {
  it('si no puede cargar los catálogos del formulario lo informa y permite reintentar', async () => {
    const findAll = vi.spyOn(ambientesRepository, 'findAll').mockImplementation(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/mi-cuenta', { usuario: DEMO.usuario })

    const datos = await screen.findByRole('region', { name: 'Datos personales' })
    expect(await within(datos).findByRole('alert')).toHaveTextContent('No pudimos cargar tus datos personales.')
    expect(screen.queryByRole('form', { name: 'Datos personales' })).not.toBeInTheDocument()

    findAll.mockRestore()
    await user.click(within(datos).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('form', { name: 'Datos personales' })).toBeInTheDocument()
    expect(campo('Nombres')).toHaveValue('Camila Alejandra')
    await within(resumen()).findAllByRole('term')
  })

  it('si no puede cargar el resumen lo informa sin bloquear el formulario y permite reintentar', async () => {
    const findAll = vi.spyOn(ticketsRepository, 'findAll').mockImplementation(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/mi-cuenta', { usuario: DEMO.usuario })

    expect(await within(await screen.findByRole('complementary')).findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tu resumen.',
    )
    expect(await screen.findByRole('form', { name: 'Datos personales' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Encuesta pendiente' })).not.toBeInTheDocument()

    findAll.mockRestore()
    await user.click(within(resumen()).getByRole('button', { name: 'Reintentar' }))

    expect(await within(resumen()).findByText('Tickets reportados')).toBeInTheDocument()
    expect(within(resumen()).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(resumen()).getByRole('region', { name: 'Encuesta pendiente' })).toBeInTheDocument()
  })
})
