import { ConfirmProvider, ToastProvider } from './shared/components'

/** Proveedores globales de la aplicación (sin el router, para reutilizarlos en las pruebas con MemoryRouter). */
export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  )
}
