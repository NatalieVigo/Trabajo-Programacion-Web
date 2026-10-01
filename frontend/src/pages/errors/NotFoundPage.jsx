import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, MessageCard } from '../../shared/components'
import './NotFoundPage.css'

/** 404 con cabecera pública (p09). */
export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada')

  return (
    <div className="container page not-found">
      <MessageCard
        code="404"
        title="No encontramos esta página"
        description="El enlace puede haber cambiado. Si buscabas un ticket, ingresa su código en el buscador de la cabecera."
        actions={
          <>
            <Button to={ROUTES.home}>Ir al inicio</Button>
            <Button to={ROUTES.iniciarSesion} variant="secondary">
              Buscar un ticket
            </Button>
          </>
        }
      />
    </div>
  )
}
