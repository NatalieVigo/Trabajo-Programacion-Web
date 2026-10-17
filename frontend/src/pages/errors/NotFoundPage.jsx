import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { getRoleHome } from '../../routes/roleHome.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, MessageCard } from '../../shared/components'
import './NotFoundPage.css'

// sin sesión, "Buscar un ticket" manda a iniciar sesión
export default function NotFoundPage() {
  const { usuario } = useAuth()
  useDocumentTitle('Página no encontrada')
  const buscarTicket = usuario ? getRoleHome(usuario.rol).ticketsPath : ROUTES.iniciarSesion

  return (
    <div className="container page not-found">
      <MessageCard
        code="404"
        title="No encontramos esta página"
        description="El enlace puede haber cambiado. Si buscabas un ticket, ingresa su código en el buscador de la cabecera."
        actions={
          <>
            <Button to={ROUTES.home}>Ir al inicio</Button>
            <Button to={buscarTicket} variant="secondary">
              Buscar un ticket
            </Button>
          </>
        }
      />
    </div>
  )
}
