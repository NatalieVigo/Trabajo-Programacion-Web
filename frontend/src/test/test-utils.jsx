import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppProviders from '../AppProviders.jsx'
import AppRoutes from '../routes/AppRoutes.jsx'

/** Renderiza `ui` con el router en memoria y los proveedores globales. Devuelve también `user` (userEvent). */
export function renderWithProviders(ui, { route = '/' } = {}) {
  const user = userEvent.setup()
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>,
  )
  return { user, ...result }
}

/** Renderiza la aplicación completa (tabla de rutas incluida) en la ruta indicada. */
export function renderApp(route = '/') {
  return renderWithProviders(<AppRoutes />, { route })
}
