import AuthProvider from './context/AuthProvider.jsx'
import { ConfirmProvider, ToastProvider } from './shared/components'

// sin el router, así las pruebas pueden usarlos con MemoryRouter
export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
