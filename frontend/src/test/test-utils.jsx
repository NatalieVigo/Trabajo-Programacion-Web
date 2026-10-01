import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import AppProviders from '../AppProviders.jsx'
import { sessionRepository } from '../repositories/session.repository.js'
import AppRoutes from '../routes/AppRoutes.jsx'

/** Cuentas de demostración del seed, para iniciar sesión en las pruebas. */
export const DEMO = Object.freeze({
  usuario: 'usr-001',
  tecnico: 'usr-002',
  supervisor: 'usr-003',
  bloqueado: 'usr-004',
  sinTickets: 'usr-007',
})

/** Deja guardada la sesión de un usuario del seed, como si hubiera ingresado sin «Recordarme». */
export function guardarSesion(usuarioId) {
  sessionRepository.save({ usuarioId, iniciadaEn: new Date().toISOString() })
}

/**
 * Renderiza `ui` con el router en memoria y los proveedores globales. Devuelve también `user` (userEvent).
 * `route` admite una ruta o una ubicación con state ({ pathname, state }). Con `usuario` (id de un usuario del seed)
 * la sesión ya está iniciada: la aplicación la restaura al montar, así que las consultas deben esperar (findBy…).
 */
export function renderWithProviders(ui, { route = '/', usuario } = {}) {
  if (usuario) guardarSesion(usuario)
  // Sin pausa entre teclas: cada setTimeout(0) de userEvent cuesta ~15 ms en Windows y alarga las pruebas de formularios.
  const user = userEvent.setup({ delay: null })
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>,
  )
  return { user, ...result }
}

/** Ruta actual del router, oculta, para que las pruebas comprueben la URL con ubicacionActual(). */
function UbicacionActual() {
  const { pathname, search } = useLocation()
  return (
    <p data-testid="ubicacion-actual" hidden>
      {pathname + search}
    </p>
  )
}

/** Renderiza la aplicación completa (tabla de rutas incluida) en la ruta indicada, con sesión si se pasa `usuario`. */
export function renderApp(route = '/', options) {
  return renderWithProviders(
    <>
      <AppRoutes />
      <UbicacionActual />
    </>,
    { route, ...options },
  )
}

/** URL (ruta y búsqueda) en la que está la aplicación renderizada con renderApp: «/supervisor/cola». */
export function ubicacionActual() {
  return screen.getByTestId('ubicacion-actual').textContent
}
