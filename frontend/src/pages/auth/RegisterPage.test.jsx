import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DB_STORAGE_KEY, readTable, writeTable } from '../../repositories/db.js'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { renderApp } from '../../test/test-utils.jsx'
import { verifyPassword } from '../../utils/password.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const DATOS = {
  nombres: 'Valeria Sofía',
  apellidos: 'Rojas Paredes',
  correo: 'valeria.rojas@aloe.ulima.edu.pe',
  telefono: '912 345 678',
  password: 'Campus2026!',
  unidad: 'Arquitectura',
  vinculo: 'Estudiante',
}
const TERMINOS = 'Acepto los términos del servicio y la política de privacidad.'
const TITULO_LANDING = 'Reporta una falla del campus y sigue su atención en un solo lugar'
const ERROR_INESPERADO = 'Ocurrió un error inesperado. Inténtalo otra vez.'

const campo = (label) => screen.getByLabelText(label)
const terminos = () => screen.getByRole('checkbox', { name: TERMINOS })

async function renderRegistro() {
  const view = renderApp('/registro')
  // Las listas de unidades y vínculos llegan del catálogo: hasta entonces los select están deshabilitados.
  await waitFor(() => expect(campo('Unidad o carrera')).toBeEnabled())
  return view
}

async function completarFormulario(user) {
  await user.type(campo('Nombres'), DATOS.nombres)
  await user.type(campo('Apellidos'), DATOS.apellidos)
  await user.type(campo('Correo institucional'), DATOS.correo)
  await user.type(campo('Teléfono'), DATOS.telefono)
  await user.type(campo('Contraseña'), DATOS.password)
  await user.type(campo('Confirmar contraseña'), DATOS.password)
  await user.selectOptions(campo('Unidad o carrera'), DATOS.unidad)
  await user.selectOptions(campo('Vínculo con la universidad'), DATOS.vinculo)
  await user.click(terminos())
}

/** Tras volver a la landing, espera sus categorías para no dejar cargas pendientes. */
async function esperarLanding() {
  expect(await screen.findByRole('heading', { level: 1, name: TITULO_LANDING })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
}

/** Con la cuenta creada se llega a «Iniciar sesión» con el correo precargado y el foco en la contraseña. */
async function esperarInicioDeSesion() {
  expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
  expect(campo('Correo institucional')).toHaveValue(DATOS.correo)
  expect(campo('Contraseña')).toHaveValue('')
  expect(campo('Contraseña')).toHaveFocus()
}

describe('RegisterPage', () => {
  it('muestra el formulario del mockup con el aviso «Antes de registrarte»', async () => {
    await renderRegistro()

    expect(screen.getByRole('heading', { level: 1, name: 'Crear mi cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Solo para miembros de la comunidad con correo institucional.')).toBeInTheDocument()
    expect(campo('Teléfono')).toHaveAccessibleDescription('Para coordinar el acceso al ambiente.')
    expect(campo('Contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con una mayúscula y un número.')
    expect(within(campo('Unidad o carrera')).getAllByRole('option')).toHaveLength(16)
    expect(
      within(campo('Vínculo con la universidad'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Selecciona tu vínculo', 'Estudiante', 'Docente', 'Personal administrativo', 'Egresado'])
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toHaveAttribute('type', 'submit')

    const aviso = screen.getByRole('complementary', { name: 'Antes de registrarte' })
    expect(aviso).toHaveTextContent(
      'Si eres técnico o supervisor no uses este formulario: el área de Infraestructura te envía una invitación con tus datos precargados.',
    )
    expect(aviso).toHaveTextContent('Tu cuenta queda activa al instante; el correo de bienvenida llega en pocos minutos.')
    expect(document.title).toBe('Crear mi cuenta · Mesa de Ayuda')
  })

  it('al enviar vacío muestra el error junto a cada campo y enfoca el primero', async () => {
    const { user } = await renderRegistro()

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const esperados = [
      ['Nombres', 'Ingresa tus nombres.'],
      ['Apellidos', 'Ingresa tus apellidos.'],
      ['Correo institucional', 'Ingresa tu correo institucional.'],
      ['Teléfono', 'Ingresa un número de contacto.'],
      ['Contraseña', 'Ingresa una contraseña.'],
      ['Confirmar contraseña', 'Confirma tu contraseña.'],
      ['Unidad o carrera', 'Selecciona tu unidad o carrera.'],
      ['Vínculo con la universidad', 'Selecciona tu vínculo con la universidad.'],
    ]
    for (const [label, mensaje] of esperados) {
      expect(campo(label)).toBeRequired()
      expect(campo(label)).toHaveAttribute('aria-invalid', 'true')
      expect(campo(label)).toHaveAccessibleDescription(mensaje)
      expect(campo(label).closest('.field')).toHaveTextContent(mensaje)
    }
    expect(terminos()).toBeRequired()
    expect(terminos()).toHaveAccessibleDescription('Debes aceptar los términos para continuar.')
    expect(campo('Nombres')).toHaveFocus()
    expect(readTable('usuarios')).toHaveLength(10)
  })

  it('valida cada campo al salir de él y lo vuelve a validar al corregirlo', async () => {
    const { user } = await renderRegistro()

    await user.type(campo('Teléfono'), '812 345 678')
    await user.type(campo('Contraseña'), 'Campus2026')
    expect(campo('Teléfono')).toHaveAccessibleDescription('Ingresa un celular de 9 dígitos que empiece con 9.')

    await user.type(campo('Confirmar contraseña'), 'Campus2025')
    await user.tab()
    expect(campo('Confirmar contraseña')).toHaveAccessibleDescription('Las contraseñas no coinciden.')

    await user.clear(campo('Teléfono'))
    await user.type(campo('Teléfono'), '912 345 678')
    expect(campo('Teléfono')).not.toHaveAttribute('aria-invalid')
    await user.type(campo('Confirmar contraseña'), '{Backspace}6')
    expect(campo('Confirmar contraseña')).not.toHaveAttribute('aria-invalid')
  })

  it('con datos válidos crea la cuenta, lo notifica y lleva a iniciar sesión con el correo precargado', async () => {
    const { user } = await renderRegistro()

    await completarFormulario(user)
    expect(screen.getByText('Segura')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Tu cuenta fue creada. Ya puedes iniciar sesión.')).toBeInTheDocument()
    await esperarInicioDeSesion()
    const creado = usuariosRepository.findByCorreo(DATOS.correo)
    expect(creado).toMatchObject({
      nombres: 'Valeria Sofía',
      apellidos: 'Rojas Paredes',
      telefono: '912345678',
      rol: 'usuario',
      unidad: 'Arquitectura',
      vinculo: 'Estudiante',
      estado: 'activo',
    })
    await expect(verifyPassword(DATOS.password, creado.passwordSalt, creado.passwordHash)).resolves.toBe(true)
  })

  it('mientras crea la cuenta muestra «Creando cuenta…» y deshabilita el formulario', async () => {
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let liberar
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(
      (...args) =>
        new Promise((resolve) => {
          liberar = () => resolve(digest(...args))
        }),
    )
    const { user } = await renderRegistro()
    await completarFormulario(user)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByRole('button', { name: 'Creando cuenta…' })).toBeDisabled()
    expect(campo('Nombres')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    await act(async () => liberar())
    expect(await screen.findByText('Tu cuenta fue creada. Ya puedes iniciar sesión.')).toBeInTheDocument()
    await esperarInicioDeSesion()
  })

  it('al salir del correo avisa si ya tiene una cuenta o si está disponible', async () => {
    const { user } = await renderRegistro()
    const correo = campo('Correo institucional')

    await user.type(correo, 'valeria@gmail.com')
    await user.tab()
    expect(correo).toHaveAccessibleDescription('Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).')

    await user.clear(correo)
    await user.type(correo, 'Camila.Quispe@aloe.ulima.edu.pe')
    await user.tab()
    await waitFor(() => expect(correo).toHaveAccessibleDescription('Ya existe una cuenta con este correo.'))
    expect(correo).toHaveAttribute('aria-invalid', 'true')

    await user.clear(correo)
    await user.type(correo, DATOS.correo)
    expect(correo).not.toHaveAttribute('aria-invalid')
    await user.tab()
    await waitFor(() => expect(correo).toHaveAccessibleDescription('Correo válido y disponible.'))
    expect(correo).not.toHaveAttribute('aria-invalid')
  })

  it('si el correo se registró mientras completaba el formulario, lo marca al enviar y lo enfoca', async () => {
    const { user } = await renderRegistro()
    await completarFormulario(user)
    await screen.findByText('Correo válido y disponible.')
    const usuarios = readTable('usuarios')
    writeTable('usuarios', [...usuarios, { ...usuarios[4], id: 'usr-099', correo: DATOS.correo }])

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const correo = campo('Correo institucional')
    await waitFor(() => expect(correo).toHaveFocus())
    expect(correo).toHaveAccessibleDescription('Ya existe una cuenta con este correo.')
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled()
    expect(readTable('usuarios')).toHaveLength(11)

    // Si edita el correo y vuelve a escribir el mismo, no reaparece la verificación anterior («disponible»).
    await user.type(correo, 'x{Backspace}')
    await user.tab()
    expect(correo).toHaveValue(DATOS.correo)
    expect(correo).toHaveAccessibleDescription('Ya existe una cuenta con este correo.')
    expect(screen.queryByText('Correo válido y disponible.')).not.toBeInTheDocument()
  })

  it('si el servicio falla de forma inesperada lo notifica y deja el formulario listo para reintentar', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('Web Crypto no respondió'))
    const { user } = await renderRegistro()
    await completarFormulario(user)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(ERROR_INESPERADO)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Crear mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled()
    expect(campo('Nombres')).toHaveValue(DATOS.nombres)
    expect(campo('Nombres')).not.toHaveAttribute('aria-invalid')
    expect(readTable('usuarios')).toHaveLength(10)
  })

  it('«Cancelar» con datos ingresados pide confirmación antes de volver al inicio', async () => {
    const { user } = await renderRegistro()
    await user.type(campo('Nombres'), 'Valeria')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Descartar el registro?' })
    expect(dialogo).toHaveAccessibleDescription('Se perderán los datos que ingresaste.')
    await user.click(within(dialogo).getByRole('button', { name: 'Seguir editando' }))
    expect(campo('Nombres')).toHaveValue('Valeria')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Descartar' }))

    await esperarLanding()
  })

  it('«Cancelar» sin datos ingresados vuelve al inicio sin preguntar', async () => {
    const { user } = await renderRegistro()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await esperarLanding()
  })

  it('si no cargan las unidades y los vínculos lo informa y permite reintentar', async () => {
    localStorage.removeItem(DB_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio disponible', 'QuotaExceededError')
    })
    const { user } = renderApp('/registro')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las unidades y los vínculos con la universidad.',
    )
    expect(campo('Unidad o carrera')).toBeDisabled()

    setItem.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(campo('Unidad o carrera')).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
