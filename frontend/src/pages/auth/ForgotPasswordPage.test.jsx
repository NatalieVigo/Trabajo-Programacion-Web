import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokensRecuperacionRepository } from '../../repositories/tokensRecuperacion.repository.js'
import { renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const CAMILA = 'camila.quispe@aloe.ulima.edu.pe'
const NUEVA = 'Campus2027!'
const BANDEJA = 'Bandeja simulada · solo entrega 1'

const campo = (label) => screen.getByLabelText(label)
const boton = (name) => screen.getByRole('button', { name })
const pasoActual = () =>
  within(screen.getByRole('list', { name: 'Pasos para recuperar tu contraseña' })).getByRole('listitem', {
    current: 'step',
  })
const bandeja = () => screen.getByRole('status', { name: BANDEJA })

/** Pide el enlace para `correo` y espera el paso 2. Devuelve su título. */
async function pedirEnlace(user, correo) {
  await user.type(campo('Correo institucional'), correo)
  await user.click(boton('Enviar enlace'))
  return screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' })
}

/** El panel de la usuaria cargó sus contadores: no quedan consultas pendientes. */
async function esperarPanel() {
  expect(await screen.findByText('Mis tickets abiertos')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByText('Cargando tu resumen…')).not.toBeInTheDocument())
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AHORA)
  })

  it('el paso 1 pide el correo institucional (p08)', () => {
    renderApp('/recuperar-contrasena')

    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
    expect(screen.getByText('Te enviaremos un enlace de restablecimiento válido por 30 minutos.')).toBeInTheDocument()
    expect(pasoActual()).toHaveTextContent('Tu correo')
    expect(campo('Correo institucional')).toHaveValue('')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Si la cuenta existe recibirás el enlace; por seguridad no informamos lo contrario.',
    )
    expect(boton('Enviar enlace')).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(screen.queryByRole('status', { name: BANDEJA })).not.toBeInTheDocument()
    expect(document.title).toBe('Recuperar mi contraseña · Mesa de Ayuda')
  })

  it('valida el correo junto al campo antes de enviar', async () => {
    const { user } = renderApp('/recuperar-contrasena')

    await user.click(boton('Enviar enlace'))

    expect(campo('Correo institucional')).toHaveFocus()
    expect(campo('Correo institucional')).toHaveAccessibleDescription('Ingresa tu correo institucional.')
    await user.type(campo('Correo institucional'), 'camila@gmail.com')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
    )
    expect(tokensRecuperacionRepository.findAll()).toEqual([])
  })

  it('envía el enlace, lo abre desde la bandeja simulada, define la nueva contraseña e ingresa con ella', async () => {
    const { user } = renderApp(`/recuperar-contrasena?correo=${encodeURIComponent(CAMILA)}`)
    expect(campo('Correo institucional')).toHaveValue(CAMILA)

    await user.click(boton('Enviar enlace'))

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText(`Enviamos el enlace a ${CAMILA}. Vence en 30 minutos.`)).toBeInTheDocument()
    expect(pasoActual()).toHaveTextContent('Enlace enviado')
    expect(screen.getByRole('button', { name: /^Reenviar enlace \(disponible en 0:4\d\)$/ })).toBeDisabled()
    expect(bandeja()).toHaveTextContent('Llegó el correo con el enlace para restablecer tu contraseña.')
    const [{ token }] = tokensRecuperacionRepository.findAll()
    const abrir = within(bandeja()).getByRole('link', { name: 'Abrir enlace de restablecimiento' })
    expect(abrir).toHaveAttribute('href', `/restablecer-contrasena/${token}`)

    await user.click(abrir)

    expect(await screen.findByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' })).toBeInTheDocument()
    expect(pasoActual()).toHaveTextContent('Nueva contraseña')
    await user.type(campo('Nueva contraseña'), NUEVA)
    expect(screen.getByText('Segura')).toBeInTheDocument()
    await user.type(campo('Confirmar'), NUEVA)
    await user.click(boton('Guardar contraseña'))

    expect(
      await screen.findByText('Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña.'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/iniciar-sesion')
    expect(campo('Correo institucional')).toHaveValue(CAMILA)
    expect(campo('Contraseña')).toHaveFocus()

    await user.type(campo('Contraseña'), NUEVA)
    await user.click(boton('Ingresar'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
    await esperarPanel()
  })

  it('con un correo sin cuenta muestra el mismo aviso, pero no llega ningún correo', async () => {
    const { user } = renderApp('/recuperar-contrasena')

    await pedirEnlace(user, 'nadie.registrado@ulima.edu.pe')

    expect(
      screen.getByText('Enviamos el enlace a nadie.registrado@ulima.edu.pe. Vence en 30 minutos.'),
    ).toBeInTheDocument()
    expect(bandeja()).toHaveTextContent('No llegó ningún correo a esta dirección.')
    expect(within(bandeja()).queryByRole('link')).not.toBeInTheDocument()
    expect(tokensRecuperacionRepository.findAll()).toEqual([])
  })

  it('«Usar otro correo» vuelve al paso 1 con el correo enviado, listo para corregirlo', async () => {
    const { user } = renderApp('/recuperar-contrasena')
    await pedirEnlace(user, 'camila.quispe@ulima.edu.pe')

    await user.click(boton('Usar otro correo'))

    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
    expect(pasoActual()).toHaveTextContent('Tu correo')
    expect(campo('Correo institucional')).toHaveValue('camila.quispe@ulima.edu.pe')
    expect(campo('Correo institucional')).toHaveFocus()
    expect(screen.queryByRole('status', { name: BANDEJA })).not.toBeInTheDocument()

    await user.clear(campo('Correo institucional'))
    await pedirEnlace(user, CAMILA)
    expect(within(bandeja()).getByRole('link', { name: 'Abrir enlace de restablecimiento' })).toBeInTheDocument()
  })

  it('si el envío falla de forma inesperada lo notifica y conserva el correo', async () => {
    vi.spyOn(tokensRecuperacionRepository, 'insert').mockImplementationOnce(() => {
      throw new Error('Sin espacio disponible')
    })
    const { user } = renderApp('/recuperar-contrasena')

    await user.type(campo('Correo institucional'), CAMILA)
    await user.click(boton('Enviar enlace'))

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
    expect(campo('Correo institucional')).toHaveValue(CAMILA)
    expect(boton('Enviar enlace')).toBeEnabled()
  })
})

describe('ForgotPasswordPage · reenvío del enlace', () => {
  const pasan = (segundos) => act(() => vi.advanceTimersByTime(segundos * 1000))

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(AHORA)
  })

  it('se habilita al terminar la cuenta de 45 segundos; al reenviar avisa, cambia el enlace y vuelve a contar', async () => {
    const { user } = renderApp('/recuperar-contrasena')
    const titulo = await pedirEnlace(user, CAMILA)
    // La cuenta regresiva arranca con el paso 2, al mismo tiempo que el foco pasa a su título.
    await vi.waitFor(() => expect(titulo).toHaveFocus())
    const reenviar = boton('Reenviar enlace (disponible en 0:45)')
    expect(reenviar).toBeDisabled()
    const enlaceAnterior = within(bandeja()).getByRole('link').getAttribute('href')

    pasan(1)
    expect(reenviar).toHaveAccessibleName('Reenviar enlace (disponible en 0:44)')
    pasan(43)
    expect(reenviar).toHaveAccessibleName('Reenviar enlace (disponible en 0:01)')
    expect(reenviar).toBeDisabled()
    pasan(1)
    expect(reenviar).toHaveAccessibleName('Reenviar enlace')
    expect(reenviar).toBeEnabled()

    await user.click(reenviar)

    expect(await screen.findByText(`Te enviamos un nuevo enlace a ${CAMILA}.`)).toBeInTheDocument()
    expect(reenviar).toHaveAccessibleName('Reenviar enlace (disponible en 0:45)')
    expect(reenviar).toBeDisabled()
    expect(titulo).toHaveFocus()
    const enlaceNuevo = within(bandeja()).getByRole('link').getAttribute('href')
    expect(enlaceNuevo).not.toBe(enlaceAnterior)
    expect(enlaceNuevo).toBe(`/restablecer-contrasena/${tokensRecuperacionRepository.findAll()[0].token}`)
    expect(tokensRecuperacionRepository.findAll()).toHaveLength(1)

    pasan(1)
    expect(reenviar).toHaveAccessibleName('Reenviar enlace (disponible en 0:44)')
  })
})
