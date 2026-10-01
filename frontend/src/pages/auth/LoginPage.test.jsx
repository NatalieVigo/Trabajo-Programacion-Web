import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY } from '../../repositories/session.repository.js'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import { usuariosRepository } from '../../repositories/usuarios.repository.js'
import { obtenerContadores } from '../../services/resumen.service.js'
import { soltarFoco } from '../../test/focus.js'
import { renderApp } from '../../test/test-utils.jsx'

// Los contadores son los reales; una prueba los demora para comprobar que el ingreso no los espera.
vi.mock('../../services/resumen.service.js', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, obtenerContadores: vi.fn(original.obtenerContadores) }
})

const AHORA = '2026-10-01T15:27:00.000Z' // 10:27 en Lima
const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }
const BIENVENIDA_CAMILA = 'Te damos la bienvenida, Camila. Tienes 3 tickets abiertos y 1 encuesta pendiente.'

const campo = (label) => screen.getByLabelText(label)
const botonIngresar = () => screen.getByRole('button', { name: 'Ingresar' })
const sesionGuardada = (storage) => JSON.parse(storage.getItem(SESSION_STORAGE_KEY))

async function ingresarCon(user, { correo, password }) {
  await user.type(campo('Correo institucional'), correo)
  await user.type(campo('Contraseña'), password)
  await user.click(botonIngresar())
}

/** El panel del rol cargó sus contadores (cabecera e Inicio): no quedan consultas pendientes. */
async function esperarPanel(pildora) {
  expect(await screen.findByText(pildora)).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByText('Cargando tu resumen…')).not.toBeInTheDocument())
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('muestra el formulario de acceso y el aviso «Acceso por rol» (p04)', () => {
    renderApp('/iniciar-sesion')

    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText('Ingresa con tu correo institucional.')).toBeInTheDocument()
    expect(campo('Correo institucional')).toHaveAttribute('type', 'email')
    expect(campo('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Recordarme en este equipo' })).not.toBeChecked()
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/recuperar-contrasena',
    )
    expect(screen.getByRole('link', { name: 'Regístrate' })).toHaveAttribute('href', '/registro')
    expect(botonIngresar()).toHaveAttribute('type', 'submit')

    const aviso = screen.getByRole('complementary', { name: 'Acceso por rol' })
    expect(aviso).toHaveTextContent(
      'Usuarios de la comunidad ingresan con su correo. Técnicos y supervisores reciben una invitación del área de Infraestructura y definen su contraseña al aceptarla.',
    )
    expect(aviso).toHaveTextContent('Tras cinco intentos fallidos la cuenta se bloquea por 15 minutos.')
    expect(document.title).toBe('Iniciar sesión · Mesa de Ayuda')
  })

  it.each([
    ['usuario', CAMILA, 'Inicio', 'Mis tickets abiertos', BIENVENIDA_CAMILA, 'usr-001'],
    [
      'técnico',
      { correo: 'jparedes@ulima.edu.pe', password: 'Tecnico2026' },
      'Mi bandeja',
      'Asignados a mí',
      'Te damos la bienvenida, Julio. Tienes 8 tickets asignados.',
      'usr-002',
    ],
    [
      'supervisor',
      { correo: 'lmendoza@ulima.edu.pe', password: 'Supervisor2026' },
      'Tablero',
      'Cola sin asignar',
      'Te damos la bienvenida, Lucía. Hay 2 tickets sin asignar en la cola.',
      'usr-003',
    ],
  ])('la cuenta de %s llega a su vista principal con la bienvenida', async (_, credenciales, inicio, pildora, bienvenida, id) => {
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, credenciales)

    expect(await screen.findByText(bienvenida)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: inicio })).toBeInTheDocument()
    await esperarPanel(pildora)
    expect(sesionGuardada(sessionStorage)).toEqual({ usuarioId: id, iniciadaEn: AHORA })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('abre la vista del rol sin esperar los contadores de la bienvenida', async () => {
    let responder
    vi.mocked(obtenerContadores).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          responder = resolve
        }),
    )
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, CAMILA)

    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
    expect(screen.queryByText(BIENVENIDA_CAMILA)).not.toBeInTheDocument()

    await act(async () =>
      responder({ ticketsAbiertos: 3, ticketsReportados: 12, encuestasPendientes: 1, encuestasRespondidas: 7 }),
    )
    expect(screen.getByText(BIENVENIDA_CAMILA)).toBeInTheDocument()
    await esperarPanel('Mis tickets abiertos')
  })

  it('con «Recordarme en este equipo» la sesión queda guardada en el equipo', async () => {
    const { user } = renderApp('/iniciar-sesion')

    await user.click(screen.getByRole('checkbox', { name: 'Recordarme en este equipo' }))
    await ingresarCon(user, CAMILA)

    await esperarPanel('Mis tickets abiertos')
    expect(sesionGuardada(localStorage)).toEqual({ usuarioId: 'usr-001', iniciadaEn: AHORA })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('con la contraseña incorrecta indica los intentos que quedan y marca la contraseña', async () => {
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, { ...CAMILA, password: 'Camila2025' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos. Te quedan 4 intentos antes del bloqueo temporal.',
    )
    expect(campo('Contraseña')).toHaveAttribute('aria-invalid', 'true')
    expect(campo('Contraseña')).toHaveAccessibleDescription('Verifica tus datos e inténtalo otra vez.')
    expect(campo('Contraseña')).toHaveFocus()
    expect(botonIngresar()).toBeEnabled()

    await user.click(botonIngresar())
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Correo o contraseña incorrectos. Te quedan 3 intentos antes del bloqueo temporal.',
      ),
    )
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('al quinto intento fallido avisa el bloqueo con la hora y ofrece restablecer la contraseña o escribir a soporte', async () => {
    const { user } = renderApp('/iniciar-sesion')
    await ingresarCon(user, { correo: 'Camila.Quispe@aloe.ulima.edu.pe', password: 'Camila2025' })
    await waitFor(() => expect(campo('Contraseña')).toHaveAttribute('aria-invalid', 'true'))
    usuariosRepository.update('usr-001', { intentosFallidos: 4 })

    await user.click(botonIngresar())

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/^Cuenta bloqueada/))
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(
      'Cuenta bloqueada por 15 minutos tras cinco intentos fallidos. Podrás ingresar a las 10:42 o restablecer tu contraseña ahora.',
    )
    // Sin un campo que corregir, el foco pasa al aviso: con Tab se llega a sus acciones.
    expect(alerta).toHaveFocus()
    await user.tab()
    expect(within(alerta).getByRole('link', { name: 'Restablecer contraseña' })).toHaveFocus()
    expect(campo('Contraseña')).not.toHaveAttribute('aria-invalid')
    const soporte = within(alerta).getByRole('button', { name: 'Escribir a soporte' })
    expect(soporte).toHaveAttribute('aria-expanded', 'false')
    expect(within(alerta).queryByRole('link', { name: 'soporte.campus@ulima.edu.pe' })).not.toBeInTheDocument()

    await user.click(soporte)
    expect(soporte).toHaveAttribute('aria-expanded', 'true')
    expect(within(alerta).getByRole('link', { name: 'soporte.campus@ulima.edu.pe' })).toHaveAttribute(
      'href',
      'mailto:soporte.campus@ulima.edu.pe',
    )

    const restablecer = within(alerta).getByRole('link', { name: 'Restablecer contraseña' })
    expect(restablecer).toHaveAttribute('href', '/recuperar-contrasena?correo=camila.quispe%40aloe.ulima.edu.pe')
    await user.click(restablecer)
    expect(await screen.findByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
    expect(campo('Correo institucional')).toHaveValue('camila.quispe@aloe.ulima.edu.pe')
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion')
  })

  it('«¿Olvidaste tu contraseña?» lleva a recuperarla con el correo que se escribió', async () => {
    const { user } = renderApp('/iniciar-sesion')

    await user.type(campo('Correo institucional'), ' JParedes@ulima.edu.pe')
    const olvido = screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
    expect(olvido).toHaveAttribute('href', '/recuperar-contrasena?correo=jparedes%40ulima.edu.pe')
    await user.click(olvido)

    expect(await screen.findByRole('heading', { level: 1, name: 'Recuperar mi contraseña' })).toBeInTheDocument()
    expect(campo('Correo institucional')).toHaveValue('jparedes@ulima.edu.pe')
  })

  it('una cuenta bloqueada por el supervisor muestra el motivo y a quién escribir', async () => {
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, { correo: 'diego.salas@aloe.ulima.edu.pe', password: 'Usuario2026' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta está bloqueada: Reportes falsos reiterados. Comunícate con soporte.campus@ulima.edu.pe.',
    )
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('al enviar vacío muestra el error junto a cada campo y enfoca el primero', async () => {
    const { user } = renderApp('/iniciar-sesion')

    await user.click(botonIngresar())

    expect(campo('Correo institucional')).toHaveAccessibleDescription('Ingresa tu correo institucional.')
    expect(campo('Contraseña')).toHaveAccessibleDescription('Ingresa una contraseña.')
    expect(campo('Correo institucional')).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.type(campo('Correo institucional'), 'camila@gmail.com')
    expect(campo('Correo institucional')).toHaveAccessibleDescription(
      'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
    )
  })

  it('mientras valida la sesión muestra «Ingresando…» con los campos y enlaces deshabilitados (p05)', async () => {
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let liberar
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(
      (...args) =>
        new Promise((resolve) => {
          liberar = () => resolve(digest(...args))
        }),
    )
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, CAMILA)

    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()
    expect(campo('Correo institucional')).toBeDisabled()
    expect(campo('Contraseña')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Recordarme en este equipo' })).toBeDisabled()
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: 'Regístrate' })).toHaveAttribute('aria-disabled', 'true')

    await act(async () => liberar())
    expect(await screen.findByText(BIENVENIDA_CAMILA)).toBeInTheDocument()
    await esperarPanel('Mis tickets abiertos')
  })

  it('precarga el correo recibido del registro o la invitación y enfoca la contraseña', () => {
    renderApp({ pathname: '/iniciar-sesion', state: { correo: 'rhuaman@ulima.edu.pe' } })

    expect(campo('Correo institucional')).toHaveValue('rhuaman@ulima.edu.pe')
    expect(campo('Contraseña')).toHaveFocus()
  })

  it('si no puede leer los contadores, igual ingresa y da una bienvenida sin resumen', async () => {
    vi.spyOn(ticketsRepository, 'findAll').mockImplementation(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/iniciar-sesion')

    await ingresarCon(user, { correo: 'jparedes@ulima.edu.pe', password: 'Tecnico2026' })

    expect(await screen.findByText('Te damos la bienvenida, Julio.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi bandeja' })).toBeInTheDocument()
  })

  it('si el servicio falla de forma inesperada lo notifica y deja el foco en «Ingresar» para reintentar', async () => {
    let rechazar
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(
      () =>
        new Promise((_, reject) => {
          rechazar = () => reject(new Error('Web Crypto no respondió'))
        }),
    )
    const { user } = renderApp('/iniciar-sesion')
    await ingresarCon(user, CAMILA)
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()
    soltarFoco()

    await act(async () => rechazar())

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(botonIngresar()).toBeEnabled()
    expect(botonIngresar()).toHaveFocus()
    expect(campo('Correo institucional')).toHaveValue(CAMILA.correo)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
