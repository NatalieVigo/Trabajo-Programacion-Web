import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../hooks/useAuth.js'
import { SESSION_STORAGE_KEY, sessionRepository } from '../repositories/session.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { DEMO, guardarSesion, renderApp, renderWithProviders } from '../test/test-utils.jsx'

const JULIO = { correo: 'jparedes@ulima.edu.pe', password: 'Tecnico2026' }

function SesionActual({ alIngresar }) {
  const { estado, usuario, iniciarSesion, refrescarUsuario, cerrarSesion } = useAuth()
  return (
    <>
      <p>Estado: {estado}</p>
      {usuario && <p>Usuario: {usuario.nombres}</p>}
      <button type="button" onClick={() => iniciarSesion(JULIO, alIngresar)}>
        Ingresar
      </button>
      <button type="button" onClick={refrescarUsuario}>
        Refrescar
      </button>
      <button type="button" onClick={() => cerrarSesion()}>
        Salir
      </button>
    </>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthProvider', () => {
  it('sin una sesión guardada muestra la aplicación de inmediato, sin indicador de carga', () => {
    renderWithProviders(<SesionActual />)

    expect(screen.getByText('Estado: anonimo')).toBeInTheDocument()
    expect(screen.queryByText('Cargando tu sesión…')).not.toBeInTheDocument()
  })

  it('restaura la sesión guardada y mientras tanto muestra un indicador a pantalla completa', async () => {
    renderWithProviders(<SesionActual />, { usuario: DEMO.usuario })

    expect(screen.getByText('Cargando tu sesión…')).toBeInTheDocument()
    expect(screen.queryByText(/^Estado:/)).not.toBeInTheDocument()
    expect(await screen.findByText('Estado: autenticado')).toBeInTheDocument()
    expect(screen.getByText('Usuario: Camila Alejandra')).toBeInTheDocument()
    expect(screen.queryByText('Cargando tu sesión…')).not.toBeInTheDocument()
  })

  it('restaura también una sesión recordada en el equipo', async () => {
    sessionRepository.save({ usuarioId: DEMO.supervisor, iniciadaEn: '2026-10-01T15:00:00.000Z' }, { recordar: true })

    renderWithProviders(<SesionActual />)

    expect(await screen.findByText('Usuario: Lucía')).toBeInTheDocument()
  })

  it('descarta la sesión guardada de una cuenta bloqueada por el supervisor', async () => {
    guardarSesion(DEMO.bloqueado)

    renderWithProviders(<SesionActual />)

    expect(await screen.findByText('Estado: anonimo')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('si no puede restaurar la sesión, la aplicación sigue sin sesión', async () => {
    vi.spyOn(usuariosRepository, 'findById').mockImplementation(() => {
      throw new Error('Sin datos')
    })

    renderWithProviders(<SesionActual />, { usuario: DEMO.usuario })

    expect(await screen.findByText('Estado: anonimo')).toBeInTheDocument()
  })

  it('iniciarSesion abre la sesión y aplica alIngresar con el usuario', async () => {
    const alIngresar = vi.fn()
    const { user } = renderWithProviders(<SesionActual alIngresar={alIngresar} />)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Estado: autenticado')).toBeInTheDocument()
    expect(screen.getByText('Usuario: Julio César')).toBeInTheDocument()
    expect(alIngresar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: DEMO.tecnico, rol: 'tecnico' }))
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  })

  it('refrescarUsuario trae los datos actuales y termina la sesión si la cuenta fue bloqueada', async () => {
    const { user } = renderWithProviders(<SesionActual />, { usuario: DEMO.usuario })
    await screen.findByText('Usuario: Camila Alejandra')

    usuariosRepository.update(DEMO.usuario, { nombres: 'Camila Sofía' })
    await user.click(screen.getByRole('button', { name: 'Refrescar' }))
    expect(await screen.findByText('Usuario: Camila Sofía')).toBeInTheDocument()

    usuariosRepository.update(DEMO.usuario, { estado: 'bloqueado', motivoBloqueo: 'Reportes falsos reiterados.' })
    await user.click(screen.getByRole('button', { name: 'Refrescar' }))
    expect(await screen.findByText('Estado: anonimo')).toBeInTheDocument()
  })

  it('cerrarSesion borra la sesión guardada', async () => {
    const { user } = renderWithProviders(<SesionActual />, { usuario: DEMO.tecnico })
    await screen.findByText('Estado: autenticado')

    await user.click(screen.getByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('Estado: anonimo')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('al abrir una página privada con la sesión guardada, la muestra tras restaurarla', async () => {
    renderApp('/supervisor', { usuario: DEMO.supervisor })

    expect(screen.getByText('Cargando tu sesión…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Tablero' })).toBeInTheDocument()
    expect(await screen.findByText('Cola sin asignar')).toBeInTheDocument()
  })
})
