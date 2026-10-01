import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, Card } from '../../shared/components'
import './NotFoundPage.css'

/** 404 con cabecera pública (p09). */
export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada')

  return (
    <div className="container page not-found">
      <Card className="not-found__card">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">No encontramos esta página</h1>
        <p className="not-found__text">
          El enlace puede haber cambiado. Si buscabas un ticket, ingresa su código en el buscador de la cabecera.
        </p>
        <div className="not-found__actions">
          <Button to={ROUTES.home}>Ir al inicio</Button>
          <Button to={ROUTES.iniciarSesion} variant="secondary">
            Buscar un ticket
          </Button>
        </div>
      </Card>
    </div>
  )
}
