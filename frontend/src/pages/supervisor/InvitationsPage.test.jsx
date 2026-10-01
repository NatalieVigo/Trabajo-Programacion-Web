import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../../repositories/db.js'
import { invitacionesRepository } from '../../repositories/invitaciones.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const ROSA = 'Rosa Elena Huamán Torres'
const PAOLA = 'Paola Andrea Quiroz Lazo'
const NUEVA = {
  nombres: 'Paola Andrea',
  apellidos: 'Quiroz Lazo',
  correo: 'pquiroz@ulima.edu.pe',
  rol: 'Técnico',
  telefono: '987 111 222',
}

const tabla = () => screen.getByRole('table', { name: 'Invitaciones enviadas' })
const nombresEnLaTabla = () => within(tabla()).getAllByRole('rowheader').map((celda) => celda.textContent)
const fila = (nombre) => within(tabla()).getByRole('rowheader', { name: nombre }).closest('tr')
const enlace = (token) => `${window.location.origin}/invitacion/${token}`
const botonRevocar = (nombre) =>
  within(fila(nombre)).getByRole('button', { name: `Revocar la invitación de ${nombre}` })
const botonCopiar = (nombre) => within(fila(nombre)).getByRole('button', { name: `Copiar enlace de ${nombre}` })

/** Abre la página con la sesión de Lucía y espera la lista y el contador de la cabecera. */
async function renderInvitaciones() {
  const view = renderApp('/supervisor/invitaciones', { usuario: DEMO.supervisor })
  await screen.findByRole('table', { name: 'Invitaciones enviadas' })
  await screen.findByText('Cola sin asignar')
  return view
}

async function abrirFormulario(user) {
  await user.click(screen.getByRole('button', { name: 'Nueva invitación' }))
  return screen.findByRole('dialog', { name: 'Nueva invitación' })
}

async function completarFormulario(user, dialogo, datos = NUEVA) {
  const campo = (label) => within(dialogo).getByLabelText(label)
  await user.type(campo('Nombres'), datos.nombres)
  await user.type(campo('Apellidos'), datos.apellidos)
  await user.type(campo('Correo institucional'), datos.correo)
  await user.selectOptions(campo('Rol'), datos.rol)
  await user.type(campo('Teléfono'), datos.telefono)
}

async function confirmarRevocacion(user, nombre) {
  await user.click(botonRevocar(nombre))
  const confirmacion = await screen.findByRole('alertdialog', { name: '¿Revocar la invitación?' })
  await user.click(within(confirmacion).getByRole('button', { name: 'Revocar invitación' }))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('InvitationsPage · lista', () => {
  it('muestra las invitaciones con su rol, estado y fechas, y resume cuántas hay de cada estado', async () => {
    await renderInvitaciones()

    expect(screen.getByRole('heading', { level: 1, name: 'Invitaciones' })).toBeInTheDocument()
    expect(screen.getByText('4 invitaciones · 2 pendientes, 1 aceptada, 1 vencida')).toBeInTheDocument()
    expect(nombresEnLaTabla()).toEqual([
      'Martín Alonso Cárdenas Vela',
      ROSA,
      'Hernán Loayza Pomar',
      'Julio César Paredes Soto',
    ])
    const celdasDeRosa = within(fila(ROSA))
      .getAllByRole('cell')
      .map((celda) => celda.textContent)
    expect(celdasDeRosa.slice(0, 5)).toEqual([
      'rhuaman@ulima.edu.pe',
      'Técnico',
      'Pendiente',
      '29/09/2026',
      '31/12/2026',
    ])
    expect(botonCopiar(ROSA)).toBeInTheDocument()
    expect(botonRevocar(ROSA)).toBeInTheDocument()
    expect(within(fila('Martín Alonso Cárdenas Vela')).getByText('Supervisor')).toBeInTheDocument()
    expect(within(fila('Hernán Loayza Pomar')).getByText('Vencida')).toBeInTheDocument()
    expect(within(fila('Hernán Loayza Pomar')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(fila('Julio César Paredes Soto')).getByText('Aceptada')).toBeInTheDocument()
    expect(within(fila('Julio César Paredes Soto')).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Mostrando 4 de 4 invitaciones')).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: 'Todas 4' })).toBeChecked()
    for (const estado of ['Pendientes 2', 'Aceptadas 1', 'Vencidas 1', 'Rechazadas 0', 'Revocadas 0']) {
      expect(screen.getByRole('radio', { name: estado })).not.toBeChecked()
    }
    const menu = screen.getByRole('navigation', { name: 'Supervisión' })
    expect(within(menu).getByRole('link', { name: 'Invitaciones' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Invitaciones · Mesa de Ayuda')
  })

  it('filtra por estado y busca por nombre o correo', async () => {
    const { user } = await renderInvitaciones()

    await user.click(screen.getByRole('radio', { name: 'Vencidas 1' }))
    expect(nombresEnLaTabla()).toEqual(['Hernán Loayza Pomar'])
    expect(screen.getByText('Mostrando 1 de 4 invitaciones')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Todas 4' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'huaman')
    expect(nombresEnLaTabla()).toEqual([ROSA])

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(nombresEnLaTabla()).toHaveLength(4)
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('si ninguna invitación coincide con los filtros muestra un estado vacío que permite verlas todas', async () => {
    const { user } = await renderInvitaciones()

    await user.click(screen.getByRole('radio', { name: 'Revocadas 0' }))

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ninguna invitación coincide con los filtros' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Prueba con otro estado o busca otro nombre o correo.')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 0 de 4 invitaciones')).toHaveAttribute('role', 'status')

    await user.click(screen.getByRole('button', { name: 'Ver todas las invitaciones' }))

    expect(nombresEnLaTabla()).toHaveLength(4)
    expect(screen.getByRole('radio', { name: 'Todas 4' })).toBeChecked()
  })

  it('sin invitaciones muestra un estado vacío con la acción para crear la primera', async () => {
    writeTable('invitaciones', [])
    const { user } = renderApp('/supervisor/invitaciones', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('heading', { level: 2, name: 'Aún no hay invitaciones' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Crear la primera invitación' }))

    expect(await screen.findByRole('dialog', { name: 'Nueva invitación' })).toBeInTheDocument()
    await screen.findByText('Cola sin asignar')
  })

  it('si no puede cargar las invitaciones lo indica y permite reintentar', async () => {
    vi.spyOn(invitacionesRepository, 'findAll').mockImplementationOnce(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/supervisor/invitaciones', { usuario: DEMO.supervisor })

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las invitaciones.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('table', { name: 'Invitaciones enviadas' })).toBeInTheDocument()
    await screen.findByText('Cola sin asignar')
  })
})

describe('InvitationsPage · «Copiar enlace»', () => {
  it('copia el enlace de una invitación pendiente y lo notifica', async () => {
    const { user } = await renderInvitaciones()

    await user.click(botonCopiar(ROSA))

    expect(await screen.findByText('Enlace copiado al portapapeles.')).toBeInTheDocument()
    await expect(navigator.clipboard.readText()).resolves.toBe(enlace('INV-TEC-2026-DEMO'))
  })

  it('si el navegador no permite copiar, muestra el enlace en la notificación', async () => {
    const { user } = await renderInvitaciones()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('Sin permiso', 'NotAllowedError'))

    await user.click(botonCopiar(ROSA))

    expect(
      await screen.findByText(`No pudimos copiar el enlace. Cópialo manualmente: ${enlace('INV-TEC-2026-DEMO')}`),
    ).toBeInTheDocument()
  })
})

describe('InvitationsPage · «Revocar»', () => {
  it('revoca una invitación pendiente solo después de confirmarlo', async () => {
    const { user } = await renderInvitaciones()

    await user.click(botonRevocar(ROSA))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Revocar la invitación?' })
    expect(confirmacion).toHaveAccessibleDescription(`${ROSA} ya no podrá activar su cuenta con este enlace.`)
    await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
    expect(invitacionesRepository.findById('inv-001').estado).toBe('pendiente')
    expect(botonRevocar(ROSA)).toHaveFocus()

    await confirmarRevocacion(user, ROSA)

    expect(await screen.findByText(`Revocaste la invitación de ${ROSA}.`)).toBeInTheDocument()
    expect(within(fila(ROSA)).getByText('Revocada')).toBeInTheDocument()
    expect(within(fila(ROSA)).queryByRole('button')).not.toBeInTheDocument()
    expect(fila(ROSA)).toHaveFocus()
    expect(screen.getByText('4 invitaciones · 1 pendiente, 1 aceptada, 1 vencida, 1 revocada')).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001')).toMatchObject({ estado: 'revocada', respondidaEn: null })
  })

  it('si la invitación cambió mientras tanto, avisa el motivo y vuelve a cargar la lista', async () => {
    const { user } = await renderInvitaciones()
    await user.click(botonRevocar(ROSA))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Revocar la invitación?' })
    invitacionesRepository.update('inv-001', { estado: 'aceptada', respondidaEn: AHORA })

    await user.click(within(confirmacion).getByRole('button', { name: 'Revocar invitación' }))

    expect(await screen.findByText('Esta invitación ya fue aceptada.')).toBeInTheDocument()
    await waitFor(() => expect(within(fila(ROSA)).getByText('Aceptada')).toBeInTheDocument())
    expect(screen.getByText('4 invitaciones · 1 pendiente, 2 aceptadas, 1 vencida')).toBeInTheDocument()
  })
})

describe('InvitationsPage · «Nueva invitación»', () => {
  it('crea la invitación, la agrega a la lista y muestra el enlace para copiarlo', async () => {
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)
    expect(dialogo).toHaveAccessibleDescription(
      'Generaremos un enlace para que la persona invitada active su cuenta. Vence a los 7 días.',
    )
    expect(within(dialogo).getByLabelText('Nombres')).toHaveFocus()

    await completarFormulario(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(await screen.findByText(`Invitación creada para ${PAOLA}.`)).toBeInTheDocument()
    const creada = screen.getByRole('dialog', { name: 'Invitación creada' })
    expect(creada).toHaveAccessibleDescription(
      `Comparte este enlace con ${PAOLA} para que active su cuenta de técnico.`,
    )
    const guardada = invitacionesRepository.findById('inv-005')
    expect(guardada).toMatchObject({
      nombres: 'Paola Andrea',
      apellidos: 'Quiroz Lazo',
      correo: 'pquiroz@ulima.edu.pe',
      rol: 'tecnico',
      telefono: '987111222',
      invitadoPor: DEMO.supervisor,
      estado: 'pendiente',
    })
    const campoEnlace = within(creada).getByLabelText('Enlace de invitación')
    expect(campoEnlace).toHaveValue(enlace(guardada.token))
    expect(campoEnlace).toHaveAccessibleDescription('Vence el 08/10/2026.')
    const copiar = within(creada).getByRole('button', { name: 'Copiar enlace' })
    expect(copiar).toHaveFocus()

    await user.click(copiar)
    expect(await screen.findByText('Enlace copiado al portapapeles.')).toBeInTheDocument()
    await expect(navigator.clipboard.readText()).resolves.toBe(enlace(guardada.token))

    await user.click(within(creada).getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva invitación' })).toHaveFocus()
    expect(nombresEnLaTabla()[0]).toBe(PAOLA)
    expect(within(fila(PAOLA)).getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('5 invitaciones · 3 pendientes, 1 aceptada, 1 vencida')).toBeInTheDocument()
  })

  it('muestra el error junto a cada campo, enfoca el primero y no crea la invitación', async () => {
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)
    const campo = (label) => within(dialogo).getByLabelText(label)

    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(campo('Nombres')).toHaveFocus()
    expect(campo('Nombres')).toHaveAccessibleDescription('Ingresa los nombres de la persona invitada.')
    expect(campo('Apellidos')).toHaveAccessibleDescription('Ingresa los apellidos de la persona invitada.')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Ingresa el correo institucional de la persona invitada.',
    )
    expect(campo('Rol')).toHaveAccessibleDescription('Selecciona el rol: técnico o supervisor.')
    expect(campo('Teléfono')).toHaveAccessibleDescription('Ingresa un número de contacto.')

    await user.type(campo('Correo institucional'), 'paola@gmail.com')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Usa un correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
    )
    await user.type(campo('Teléfono'), '812345678')
    expect(campo('Teléfono')).toHaveAccessibleDescription('Ingresa un celular de 9 dígitos que empiece con 9.')
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it.each([
    ['ya tiene una cuenta', 'jparedes@ulima.edu.pe', 'Ya existe una cuenta con este correo.'],
    ['ya tiene una invitación pendiente', 'RHuaman@ulima.edu.pe', 'Ya hay una invitación pendiente para este correo.'],
  ])('si el correo %s lo indica junto al correo', async (_, correo, mensaje) => {
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)

    await completarFormulario(user, dialogo, { ...NUEVA, correo })
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    const campoCorreo = within(dialogo).getByLabelText('Correo institucional')
    await waitFor(() => expect(campoCorreo).toHaveAccessibleDescription(mensaje))
    expect(campoCorreo).toHaveFocus()
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('si el servicio falla lo notifica y conserva los datos para reintentar', async () => {
    vi.spyOn(invitacionesRepository, 'insert').mockImplementationOnce(() => {
      throw new Error('Sin espacio')
    })
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)

    await completarFormulario(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva invitación' })).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Nombres')).toHaveValue('Paola Andrea')
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('cerrar el formulario con datos pide confirmación antes de descartarlos', async () => {
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)
    await user.type(within(dialogo).getByLabelText('Nombres'), 'Paola')

    await user.keyboard('{Escape}')
    let confirmacion = await screen.findByRole('alertdialog', { name: '¿Descartar la invitación?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Seguir editando' }))
    expect(within(dialogo).getByLabelText('Nombres')).toHaveValue('Paola')

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    confirmacion = await screen.findByRole('alertdialog', { name: '¿Descartar la invitación?' })
    await user.click(within(confirmacion).getByRole('button', { name: 'Descartar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Nueva invitación' })).toHaveFocus()
    const nuevoDialogo = await abrirFormulario(user)
    expect(within(nuevoDialogo).getByLabelText('Nombres')).toHaveValue('')
  })

  it('sin datos ingresados se cierra sin pedir confirmación', async () => {
    const { user } = await renderInvitaciones()
    const dialogo = await abrirFormulario(user)

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
