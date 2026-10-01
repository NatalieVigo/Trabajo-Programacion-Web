import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokensRecuperacionRepository } from '../../repositories/tokensRecuperacion.repository.js'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { restablecerPassword, solicitarRecuperacion } from '../../services/auth.service.js'
import { renderApp } from '../../test/test-utils.jsx'
import { verifyPassword } from '../../utils/password.js'

const AHORA = '2026-10-01T15:00:00.000Z'
const CAMILA = 'camila.quispe@aloe.ulima.edu.pe'
const NUEVA = 'Campus2027!'

const campo = (label) => screen.getByLabelText(label)
const boton = (name) => screen.getByRole('button', { name })
const pasos = () =>
  within(screen.getByRole('list', { name: 'Pasos para recuperar tu contraseña' })).getAllByRole('listitem')
const camilaTieneLaContrasena = (password) => {
  const { passwordSalt, passwordHash } = usuariosRepository.findById('usr-001')
  return verifyPassword(password, passwordSalt, passwordHash)
}

/** Pide un enlace de recuperación para Camila y devuelve su token. */
async function enlaceDeCamila() {
  const { tokenDemo } = await solicitarRecuperacion(CAMILA)
  return tokenDemo
}

async function abrirEnlace(token) {
  const view = renderApp(`/restablecer-contrasena/${token}`)
  await screen.findByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' })
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ResetPasswordPage · enlace vigente', () => {
  it('comprueba el enlace y muestra el paso 3 con la cuenta (p09)', async () => {
    renderApp(`/restablecer-contrasena/${await enlaceDeCamila()}`)
    expect(screen.getByText('Verificando el enlace…')).toHaveAttribute('role', 'status')

    expect(await screen.findByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' })).toBeInTheDocument()
    expect(screen.getByText(`Para la cuenta ${CAMILA}.`)).toBeInTheDocument()
    const [correo, enlace, nueva] = pasos()
    expect(correo).toHaveTextContent('Tu correo (completado)')
    expect(enlace).toHaveTextContent('Enlace enviado (completado)')
    expect(nueva).toHaveAttribute('aria-current', 'step')
    expect(campo('Nueva contraseña')).toHaveAttribute('type', 'password')
    expect(campo('Nueva contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con una mayúscula y un número.')
    expect(campo('Confirmar')).toHaveAttribute('autocomplete', 'new-password')
    expect(boton('Guardar contraseña')).toHaveAttribute('type', 'submit')
    expect(document.title).toBe('Nueva contraseña · Mesa de Ayuda')
  })

  it('valida la nueva contraseña junto a cada campo sin gastar el enlace', async () => {
    const token = await enlaceDeCamila()
    const { user } = await abrirEnlace(token)

    await user.click(boton('Guardar contraseña'))

    expect(campo('Nueva contraseña')).toHaveFocus()
    expect(campo('Nueva contraseña')).toHaveAccessibleDescription('Ingresa una contraseña.')
    expect(campo('Confirmar')).toHaveAccessibleDescription('Confirma tu contraseña.')

    await user.type(campo('Nueva contraseña'), 'campus2027')
    expect(screen.getByText('Débil')).toBeInTheDocument()
    expect(campo('Nueva contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con una mayúscula y un número.')
    await user.type(campo('Confirmar'), 'Campus2027')
    expect(campo('Confirmar')).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    expect(tokensRecuperacionRepository.findByToken(token).usadoEn).toBeNull()
  })

  it('mientras guarda muestra «Guardando…» con el formulario deshabilitado y luego lleva a iniciar sesión', async () => {
    const { user } = await abrirEnlace(await enlaceDeCamila())
    await user.type(campo('Nueva contraseña'), NUEVA)
    await user.type(campo('Confirmar'), NUEVA)
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let liberar
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(
      (...args) =>
        new Promise((resolve) => {
          liberar = () => resolve(digest(...args))
        }),
    )

    await user.click(boton('Guardar contraseña'))

    expect(boton('Guardando…')).toBeDisabled()
    expect(campo('Nueva contraseña')).toBeDisabled()
    expect(campo('Confirmar')).toBeDisabled()

    await act(async () => liberar())
    expect(
      await screen.findByText('Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña.'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(campo('Correo institucional')).toHaveValue(CAMILA)
    await expect(camilaTieneLaContrasena(NUEVA)).resolves.toBe(true)
  })

  it('si el enlace deja de servir mientras completa el formulario, lo avisa al guardar', async () => {
    const { user } = await abrirEnlace(await enlaceDeCamila())
    await user.type(campo('Nueva contraseña'), NUEVA)
    await user.type(campo('Confirmar'), NUEVA)
    // Desde otra pestaña se pide un enlace nuevo, que reemplaza a este.
    await solicitarRecuperacion(CAMILA)

    await user.click(boton('Guardar contraseña'))

    expect(await screen.findByText('Este enlace para restablecer la contraseña no es válido.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos este enlace' })).toBeInTheDocument()
    await expect(camilaTieneLaContrasena('Camila2026')).resolves.toBe(true)
  })
})

describe('ResetPasswordPage · enlaces que ya no sirven', () => {
  it('un enlace que no existe lo explica y lleva a pedir uno nuevo', async () => {
    const { user } = renderApp('/restablecer-contrasena/REC-NO-EXISTE')

    const titulo = await screen.findByRole('heading', { level: 1, name: 'No encontramos este enlace' })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Revisa que el enlace esté completo. Si pediste más de uno, solo sirve el del correo más reciente.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion')

    await user.click(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
  })

  it('un enlace vencido lo explica', async () => {
    const token = await enlaceDeCamila()
    vi.setSystemTime('2026-10-01T15:30:00.000Z')

    renderApp(`/restablecer-contrasena/${token}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Este enlace venció' })).toBeInTheDocument()
    expect(screen.getByText('Enlace vencido')).toBeInTheDocument()
    expect(
      screen.getByText('Los enlaces para restablecer la contraseña son válidos por 30 minutos. Solicita uno nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toHaveAttribute(
      'href',
      '/recuperar-contrasena',
    )
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
  })

  it('un enlace ya usado lo explica', async () => {
    const token = await enlaceDeCamila()
    await restablecerPassword(token, NUEVA, NUEVA)

    renderApp(`/restablecer-contrasena/${token}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Este enlace ya se usó' })).toBeInTheDocument()
    expect(screen.getByText('Enlace usado')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cada enlace sirve una sola vez. Si necesitas cambiar tu contraseña otra vez, solicita uno nuevo.',
      ),
    ).toBeInTheDocument()
  })

  it('si no puede comprobar el enlace lo informa y permite reintentar', async () => {
    const token = await enlaceDeCamila()
    vi.spyOn(tokensRecuperacionRepository, 'findByToken').mockImplementationOnce(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp(`/restablecer-contrasena/${token}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar el enlace. Inténtalo otra vez.')
    await user.click(boton('Reintentar'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' })).toBeInTheDocument()
  })
})
