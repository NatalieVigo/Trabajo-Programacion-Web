import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { getRoleHome } from '../../routes/roleHome.js'
import { Button, Card, PageHeader, PendingFeature } from '../../shared/components'
import SearchedCodeNotice from './SearchedCodeNotice.jsx'
import './PlaceholderPage.css'

/**
 * Sección privada que implementará otra historia: título, el código buscado en la cabecera si lo hay y PendingFeature
 * con un enlace a la vista principal del rol (salvo si ya se está en ella).
 */
export default function PlaceholderPage({ title, subtitle, pendiente }) {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const home = getRoleHome(usuario.rol)
  useDocumentTitle(title)

  return (
    <div className="placeholder-page">
      <PageHeader title={title} subtitle={subtitle} />
      <SearchedCodeNotice className="placeholder-page__notice" />
      <Card>
        <PendingFeature
          {...pendiente}
          action={
            pathname !== home.path && (
              <Button to={home.path} variant="secondary">
                Ir a {home.label}
              </Button>
            )
          }
        />
      </Card>
    </div>
  )
}
