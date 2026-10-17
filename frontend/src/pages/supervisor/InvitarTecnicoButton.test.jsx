import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable } from '../../repositories/db.js'
import { invitacionesRepository } from '../../repositories/invitaciones.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const PAOLA = 'Paola Andrea Quiroz Lazo'
const NUEVA = {
  nombres: 'Paola Andrea',
  apellidos: 'Quiroz Lazo',
  correo: 'pquiroz@ulima.edu.pe',
  telefono: '987 111 222',
}

const enlace = (token) => `${window.location.origin}/invitacion/${token}`
const botonInvitar = () => screen.getByRole('button', { name: 'Invitar técnico' })

async function renderTecnicos() {
  const view = renderApp('/supervisor/tecnicos', { usuario: DEMO.supervisor })
  await screen.findByRole('table', { name: 'Categorías habilitadas por técnico' })
  await screen.findByText('Cola sin asignar')
  return view
}

async function abrirFormulario(user) {
  await user.click(botonInvitar())
  return screen.findByRole('dialog', { name: 'Nueva invitación' })
}

async function completarFormulario(user, dialogo, datos = NUEVA) {
  const campo = (label) => within(dialogo).getByLabelText(label)
  await user.type(campo('Nombres'), datos.nombres)
  await user.type(campo('Apellidos'), datos.apellidos)
  await user.type(campo('Correo institucional'), datos.correo)
  await user.type(campo('Teléfono'), datos.telefono)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('InvitarTecnicoButton', () => {
  it('crea la invitación de un técnico y muestra el enlace para copiarlo', async () => {
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)
    expect(dialogo).toHaveAccessibleDescription(
      'Generaremos un enlace para que la persona invitada active su cuenta. Vence a los 7 días.',
    )
    expect(within(dialogo).getByLabelText('Nombres')).toHaveFocus()
    expect(within(dialogo).getByLabelText('Rol')).toHaveValue('tecnico')

    await completarFormulario(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(await screen.findByText(`Invitación creada para ${PAOLA}.`)).toBeInTheDocument()
    const creada = screen.getByRole('dialog', { name: 'Invitación creada' })
    expect(creada).toHaveAccessibleDescription(`Comparte este enlace con ${PAOLA} para que active su cuenta de técnico.`)
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
    expect(botonInvitar()).toHaveFocus()
  })

  it('también invita a un supervisor si se cambia el rol', async () => {
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)

    await completarFormulario(user, dialogo)
    await user.selectOptions(within(dialogo).getByLabelText('Rol'), 'Supervisor')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    const creada = await screen.findByRole('dialog', { name: 'Invitación creada' })
    expect(creada).toHaveAccessibleDescription(
      `Comparte este enlace con ${PAOLA} para que active su cuenta de supervisor.`,
    )
    expect(invitacionesRepository.findById('inv-005').rol).toBe('supervisor')
  })

  it('si el navegador no permite copiar, muestra el enlace en la notificación', async () => {
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)
    await completarFormulario(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))
    const creada = await screen.findByRole('dialog', { name: 'Invitación creada' })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('Sin permiso', 'NotAllowedError'))

    await user.click(within(creada).getByRole('button', { name: 'Copiar enlace' }))

    const { token } = invitacionesRepository.findById('inv-005')
    expect(
      await screen.findByText(`No pudimos copiar el enlace. Cópialo manualmente: ${enlace(token)}`),
    ).toBeInTheDocument()
  })

  it('muestra el error junto a cada campo, enfoca el primero y no crea la invitación', async () => {
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)
    const campo = (label) => within(dialogo).getByLabelText(label)

    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(campo('Nombres')).toHaveFocus()
    expect(campo('Nombres')).toHaveAccessibleDescription('Ingresa los nombres de la persona invitada.')
    expect(campo('Apellidos')).toHaveAccessibleDescription('Ingresa los apellidos de la persona invitada.')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Ingresa el correo institucional de la persona invitada.',
    )
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
    const { user } = await renderTecnicos()
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
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)

    await completarFormulario(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Crear invitación' }))

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva invitación' })).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Nombres')).toHaveValue('Paola Andrea')
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('cerrar el formulario con datos pide confirmación antes de descartarlos', async () => {
    const { user } = await renderTecnicos()
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
    expect(botonInvitar()).toHaveFocus()
    const nuevoDialogo = await abrirFormulario(user)
    expect(within(nuevoDialogo).getByLabelText('Nombres')).toHaveValue('')
  })

  it('sin datos ingresados se cierra sin pedir confirmación', async () => {
    const { user } = await renderTecnicos()
    const dialogo = await abrirFormulario(user)

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
