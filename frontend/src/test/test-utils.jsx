import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import AppProviders from '../AppProviders.jsx'
import { sessionRepository } from '../repositories/session.repository.js'
import AppRoutes from '../routes/AppRoutes.jsx'

export const DEMO = Object.freeze({
  usuario: 'usr-001',
  tecnico: 'usr-002',
  supervisor: 'usr-003',
  bloqueado: 'usr-004',
  sinTickets: 'usr-007',
})

// como si hubiera ingresado sin "Recordarme"
export function guardarSesion(usuarioId) {
  sessionRepository.save({ usuarioId, iniciadaEn: new Date().toISOString() })
}

// con usuario la sesión se restaura al montar, así que hay que esperar con findBy
export function renderWithProviders(ui, { route = '/', usuario } = {}) {
  if (usuario) guardarSesion(usuario)
  // sin delay entre teclas, en Windows las pruebas se hacen muy lentas
  const user = userEvent.setup({ delay: null })
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>,
  )
  return { user, ...result }
}

function UbicacionActual() {
  const { pathname, search } = useLocation()
  return (
    <p data-testid="ubicacion-actual" hidden>
      {pathname + search}
    </p>
  )
}

export function renderApp(route = '/', options) {
  return renderWithProviders(
    <>
      <AppRoutes />
      <UbicacionActual />
    </>,
    { route, ...options },
  )
}

export function ubicacionActual() {
  return screen.getByTestId('ubicacion-actual').textContent
}
