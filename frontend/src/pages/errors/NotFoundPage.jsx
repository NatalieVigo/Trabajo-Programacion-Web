import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { getRoleHome } from '../../routes/roleHome.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, MessageCard } from '../../shared/components'
import './NotFoundPage.css'

/** 404 con cabecera pública (p09). «Buscar un ticket» lleva a la lista de tickets del rol o, sin sesión, a ingresar. */
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
