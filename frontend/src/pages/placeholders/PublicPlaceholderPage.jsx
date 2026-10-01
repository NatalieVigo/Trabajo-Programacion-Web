import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, Card, PageHeader, PendingFeature } from '../../shared/components'
import './PublicPlaceholderPage.css'

/** Sección pública de una etapa posterior de HU-1 (por ahora, la recuperación de contraseña de la 1.6). */
export default function PublicPlaceholderPage({ title, pendiente }) {
  useDocumentTitle(title)

  return (
    <div className="container page public-placeholder">
      <Card className="public-placeholder__card">
        <PageHeader title={title} />
        <PendingFeature
          {...pendiente}
          action={
            <Button to={ROUTES.iniciarSesion} variant="secondary">
              Volver a iniciar sesión
            </Button>
          }
        />
      </Card>
    </div>
  )
}
