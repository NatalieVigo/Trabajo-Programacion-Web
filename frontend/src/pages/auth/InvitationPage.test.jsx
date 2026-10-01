import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categoriasRepository } from '../../repositories/catalogo.repository.js'
import { DB_STORAGE_KEY, readTable, writeTable } from '../../repositories/db.js'
import { invitacionesRepository } from '../../repositories/invitaciones.repository.js'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { renderApp } from '../../test/test-utils.jsx'
import { verifyPassword } from '../../utils/password.js'

const PASSWORD = 'Rosa2026!'
const ESPECIALIDADES = 'Especialidad · Elige hasta tres categorías'
const TITULO_LANDING = 'Reporta una falla del campus y sigue su atención en un solo lugar'

const campo = (label) => screen.getByLabelText(label)
const chip = (name) => screen.getByRole('button', { name })
const especialidades = () => screen.getByRole('group', { name: ESPECIALIDADES })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime('2026-10-01T15:00:00.000Z')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Espera a que carguen la invitación y las categorías que se pueden elegir como especialidad. */
async function esperarFormulario() {
  const grupo = await screen.findByRole('group', { name: ESPECIALIDADES })
  await within(grupo).findByRole('button', { name: 'Audiovisuales' })
}

async function renderInvitacion(token = 'INV-TEC-2026-DEMO') {
  const view = renderApp(`/invitacion/${token}`)
  await esperarFormulario()
  return view
}

async function completarFormulario(user) {
  await user.type(campo('Contraseña'), PASSWORD)
  await user.type(campo('Confirmar contraseña'), PASSWORD)
  await user.click(chip('Audiovisuales'))
  await user.click(chip('Redes y conectividad'))
}

/** Tras volver a la landing, espera sus categorías para no dejar cargas pendientes. */
async function esperarLanding() {
  expect(await screen.findByRole('heading', { level: 1, name: TITULO_LANDING })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
}

/** Con la cuenta activa se llega a «Iniciar sesión» con el correo de la invitación precargado. */
async function esperarInicioDeSesion(correo) {
  expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
  expect(campo('Correo institucional')).toHaveValue(correo)
  expect(campo('Contraseña')).toHaveFocus()
}

describe('InvitationPage · invitación vigente', () => {
  it('muestra los datos precargados de la invitación (p07)', async () => {
    renderApp('/invitacion/INV-TEC-2026-DEMO')
    expect(screen.getByText('Verificando la invitación…')).toHaveAttribute('role', 'status')
    await esperarFormulario()

    expect(screen.getByRole('heading', { level: 1, name: 'Activa tu cuenta de técnico' })).toBeInTheDocument()
    expect(screen.getByText('Invitación válida hasta el 31/12/2026')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Lucía Mendoza Ríos te invitó a la Mesa de Ayuda. Revisa tus datos, define tu contraseña y elige tu especialidad.',
      ),
    ).toBeInTheDocument()
    expect(campo('Nombres y apellidos')).toHaveValue('Rosa Elena Huamán Torres')
    expect(campo('Nombres y apellidos')).toHaveAttribute('readonly')
    expect(campo('Nombres y apellidos')).toHaveAccessibleDescription('Dato de la invitación, no editable.')
    expect(campo('Correo institucional')).toHaveValue('rhuaman@ulima.edu.pe')
    expect(campo('Correo institucional')).toHaveAttribute('readonly')
    expect(campo('Rol asignado')).toHaveValue('Técnico')
    expect(campo('Rol asignado')).toHaveAttribute('readonly')
    expect(campo('Teléfono de contacto')).toHaveValue('951 220 874')
    expect(campo('Teléfono de contacto')).not.toHaveAttribute('readonly')
    expect(campo('Contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con una mayúscula y un número.')
    expect(
      within(especialidades())
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'Audiovisuales',
      'Redes y conectividad',
      'Climatización',
      'Eléctrico',
      'Mobiliario',
      'Limpieza',
      'Accesos y cerraduras',
    ])
    expect(screen.getByRole('button', { name: 'Activar mi cuenta' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('button', { name: 'Rechazar invitación' })).toHaveAttribute('type', 'button')
    expect(document.title).toBe('Invitación · Mesa de Ayuda')
  })

  it('con datos válidos crea la cuenta de técnico con sus especialidades y lleva a iniciar sesión', async () => {
    const { user } = await renderInvitacion()

    await completarFormulario(user)
    expect(screen.getByText('Segura')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    expect(await screen.findByText('Tu cuenta de técnico está activa. Ya puedes iniciar sesión.')).toBeInTheDocument()
    await esperarInicioDeSesion('rhuaman@ulima.edu.pe')
    const creado = usuariosRepository.findByCorreo('rhuaman@ulima.edu.pe')
    expect(creado).toMatchObject({
      nombres: 'Rosa Elena',
      apellidos: 'Huamán Torres',
      telefono: '951220874',
      rol: 'tecnico',
      unidad: 'Dirección de Infraestructura y Servicios',
      vinculo: null,
      especialidades: ['cat-01', 'cat-02'],
      estado: 'activo',
      invitacionId: 'inv-001',
    })
    await expect(verifyPassword(PASSWORD, creado.passwordSalt, creado.passwordHash)).resolves.toBe(true)
    expect(invitacionesRepository.findById('inv-001').estado).toBe('aceptada')
  })

  it('la invitación de supervisor activa una cuenta de supervisor', async () => {
    const { user } = await renderInvitacion('INV-SUP-2026-DEMO')
    expect(screen.getByRole('heading', { level: 1, name: 'Activa tu cuenta de supervisor' })).toBeInTheDocument()
    expect(campo('Rol asignado')).toHaveValue('Supervisor')

    await completarFormulario(user)
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    expect(await screen.findByText('Tu cuenta de supervisor está activa. Ya puedes iniciar sesión.')).toBeInTheDocument()
    await esperarInicioDeSesion('mcardenas@ulima.edu.pe')
    expect(usuariosRepository.findByCorreo('mcardenas@ulima.edu.pe')).toMatchObject({ rol: 'supervisor' })
  })

  it('al enviar incompleto muestra el error junto a cada campo y enfoca el primero', async () => {
    const { user } = await renderInvitacion()

    await user.clear(campo('Teléfono de contacto'))
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    expect(campo('Teléfono de contacto')).toHaveFocus()
    expect(campo('Teléfono de contacto')).toHaveAccessibleDescription('Ingresa un número de contacto.')
    expect(campo('Contraseña')).toHaveAccessibleDescription('Ingresa una contraseña.')
    expect(campo('Confirmar contraseña')).toHaveAccessibleDescription('Confirma tu contraseña.')
    expect(especialidades()).toHaveAccessibleDescription('Elige entre una y tres categorías.')
    expect(readTable('usuarios')).toHaveLength(10)

    await user.type(campo('Teléfono de contacto'), '951220874')
    await user.type(campo('Contraseña'), PASSWORD)
    await user.type(campo('Confirmar contraseña'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))
    expect(chip('Audiovisuales')).toHaveFocus()

    await user.click(chip('Limpieza'))
    expect(especialidades()).not.toHaveAccessibleDescription()
  })

  it('permite elegir hasta tres especialidades', async () => {
    const { user } = await renderInvitacion()

    await user.click(chip('Audiovisuales'))
    await user.click(chip('Climatización'))
    await user.click(chip('Eléctrico'))
    await user.click(chip('Mobiliario'))

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(3)
    expect(chip('Mobiliario')).toHaveAttribute('aria-disabled', 'true')
    expect(especialidades()).toHaveAccessibleDescription('Ya elegiste tres categorías. Quita una para elegir otra.')
  })

  it('mientras activa la cuenta muestra «Activando…» y deshabilita el formulario', async () => {
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let liberar
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(
      (...args) =>
        new Promise((resolve) => {
          liberar = () => resolve(digest(...args))
        }),
    )
    const { user } = await renderInvitacion()
    await completarFormulario(user)

    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    expect(screen.getByRole('button', { name: 'Activando…' })).toBeDisabled()
    expect(campo('Teléfono de contacto')).toBeDisabled()
    expect(chip('Limpieza')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rechazar invitación' })).toBeDisabled()

    await act(async () => liberar())
    expect(await screen.findByText('Tu cuenta de técnico está activa. Ya puedes iniciar sesión.')).toBeInTheDocument()
    await esperarInicioDeSesion('rhuaman@ulima.edu.pe')
  })

  it('si el correo ya tiene una cuenta lo indica junto al correo y dice qué hacer', async () => {
    const { user } = await renderInvitacion()
    await completarFormulario(user)
    const usuarios = readTable('usuarios')
    writeTable('usuarios', [...usuarios, { ...usuarios[4], id: 'usr-099', correo: 'rhuaman@ulima.edu.pe' }])

    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    await waitFor(() => expect(campo('Correo institucional')).toHaveFocus())
    expect(campo('Correo institucional')).toHaveAccessibleDescription('Ya existe una cuenta con este correo.')
    expect(
      screen.getByText('Este correo ya tiene una cuenta. Inicia sesión con ella o pide ayuda al supervisor.'),
    ).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001').estado).toBe('pendiente')
  })

  it('si la invitación vence mientras completa el formulario, lo avisa al enviar', async () => {
    const { user } = await renderInvitacion()
    await completarFormulario(user)
    vi.setSystemTime('2027-01-01T05:00:00.000Z')

    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    expect(await screen.findByText('Esta invitación venció el 31/12/2026.')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta invitación venció el 31/12/2026' }),
    ).toBeInTheDocument()
    expect(readTable('usuarios')).toHaveLength(10)
  })
})

describe('InvitationPage · categorías de la especialidad', () => {
  it('si no hay categorías activas lo indica en el grupo de especialidades', async () => {
    const sinCategorias = 'Aún no hay categorías activas. Pide al supervisor que active al menos una.'
    writeTable('categorias', readTable('categorias').map((categoria) => ({ ...categoria, activa: false })))
    renderApp('/invitacion/INV-TEC-2026-DEMO')

    const grupo = await screen.findByRole('group', { name: ESPECIALIDADES })
    await waitFor(() => expect(grupo).toHaveAccessibleDescription(sinCategorias))
    expect(within(grupo).queryAllByRole('button')).toHaveLength(0)
  })

  it('si una categoría elegida se desactiva antes de enviar, lo indica junto a las especialidades', async () => {
    const noDisponible = 'Una de las categorías elegidas ya no está disponible. Actualiza la página y elige otra.'
    const { user } = await renderInvitacion()
    await completarFormulario(user)
    const categorias = readTable('categorias')
    writeTable('categorias', categorias.map((categoria) => ({ ...categoria, activa: categoria.id !== 'cat-01' })))

    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))

    await waitFor(() => expect(especialidades()).toHaveAccessibleDescription(noDisponible))
    expect(chip('Audiovisuales')).toHaveFocus()
    expect(readTable('usuarios')).toHaveLength(10)
  })

  it('si no se pueden cargar las categorías lo informa y permite reintentar', async () => {
    vi.spyOn(categoriasRepository, 'findAll').mockImplementationOnce(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/invitacion/INV-TEC-2026-DEMO')

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las categorías de servicio.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await esperarFormulario()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('InvitationPage · rechazar', () => {
  it('pide confirmación y, si se cancela, no cambia nada', async () => {
    const { user } = await renderInvitacion()

    await user.click(screen.getByRole('button', { name: 'Rechazar invitación' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Rechazar la invitación?' })
    expect(dialogo).toHaveAccessibleDescription('No podrás activar tu cuenta con este enlace.')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Activa tu cuenta de técnico' })).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001').estado).toBe('pendiente')
  })

  it('al confirmar rechaza la invitación, lo notifica y muestra que fue rechazada', async () => {
    const { user } = await renderInvitacion()

    await user.click(screen.getByRole('button', { name: 'Rechazar invitación' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Rechazar la invitación?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Rechazar invitación' }))

    expect(await screen.findByText('Rechazaste la invitación.')).toBeInTheDocument()
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Esta invitación fue rechazada' })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText('Si fue un error, pide al supervisor que te envíe una nueva invitación.')).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001')).toMatchObject({
      estado: 'rechazada',
      respondidaEn: '2026-10-01T15:00:00.000Z',
    })
    expect(usuariosRepository.findByCorreo('rhuaman@ulima.edu.pe')).toBeNull()
  })

  it('si la invitación cambió mientras confirmaba, lo avisa y muestra su estado actual', async () => {
    const { user } = await renderInvitacion()

    await user.click(screen.getByRole('button', { name: 'Rechazar invitación' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Rechazar la invitación?' })
    invitacionesRepository.update('inv-001', { estado: 'revocada' })
    await user.click(within(dialogo).getByRole('button', { name: 'Rechazar invitación' }))

    expect(await screen.findByText('Esta invitación fue revocada por el supervisor.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Esta invitación fue revocada' })).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001')).toMatchObject({ estado: 'revocada', respondidaEn: null })
  })

  it('si el rechazo falla por otro motivo, lo avisa y permite intentarlo otra vez', async () => {
    vi.spyOn(invitacionesRepository, 'update').mockImplementationOnce(() => {
      throw new Error('Sin espacio disponible')
    })
    const { user } = await renderInvitacion()

    await user.click(screen.getByRole('button', { name: 'Rechazar invitación' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Rechazar la invitación?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Rechazar invitación' }))

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechazar invitación' })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1, name: 'Activa tu cuenta de técnico' })).toBeInTheDocument()
    expect(invitacionesRepository.findById('inv-001').estado).toBe('pendiente')
  })
})

describe('InvitationPage · enlaces que ya no sirven', () => {
  it('informa cuándo venció la invitación y a quién pedir otra', async () => {
    renderApp('/invitacion/INV-TEC-2026-VENCIDA')

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Esta invitación venció el 12/09/2026' })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText('Invitación vencida')).toBeInTheDocument()
    expect(
      screen.getByText('Pide al supervisor que te envíe una nueva invitación para activar tu cuenta.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activar mi cuenta' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('una invitación ya aceptada lo explica y lleva al inicio', async () => {
    renderApp('/invitacion/INV-TEC-2026-USADA')

    expect(await screen.findByRole('heading', { level: 1, name: 'Esta invitación ya fue aceptada' })).toBeInTheDocument()
    expect(
      screen.getByText('La cuenta ya está activa: ingresa con tu correo institucional y tu contraseña.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('una invitación revocada por el supervisor lo explica', async () => {
    invitacionesRepository.update('inv-002', { estado: 'revocada' })
    renderApp('/invitacion/INV-SUP-2026-DEMO')

    expect(await screen.findByRole('heading', { level: 1, name: 'Esta invitación fue revocada' })).toBeInTheDocument()
    expect(
      screen.getByText('El supervisor la anuló. Si necesitas acceso a la Mesa de Ayuda, pídele una nueva invitación.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activar mi cuenta' })).not.toBeInTheDocument()
  })

  it('un enlace que no existe muestra un 404', async () => {
    const { user } = renderApp('/invitacion/INV-NO-EXISTE')

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta invitación' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))
    await esperarLanding()
  })

  it('si no se puede cargar la invitación lo informa y permite reintentar', async () => {
    localStorage.removeItem(DB_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio disponible', 'QuotaExceededError')
    })
    const { user } = renderApp('/invitacion/INV-TEC-2026-DEMO')

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la invitación. Inténtalo otra vez.')

    setItem.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Activa tu cuenta de técnico' })).toBeInTheDocument()
    await screen.findByRole('button', { name: 'Audiovisuales' })
  })
})
