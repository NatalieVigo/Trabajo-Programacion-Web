import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Alert, Button, Card, MessageCard } from '../../shared/components'
import { origenDelTicket } from './origenDelTicket.js'

/** Contenido mientras no hay ticket que mostrar, con el título de pestaña que le corresponde. */
function Estado({ titulo, children }) {
  useDocumentTitle(titulo)
  return children
}

/**
 * Lo que muestran las páginas de un ticket mientras no lo tienen: la carga, el 404 si el `codigo` no es de ningún
 * ticket o el error con «Reintentar». `status` y `error` son los de useAsyncData.
 */
export default function CargaDelTicket({ status, error, codigo, onReintentar }) {
  const { usuario } = useAuth()
  const origen = origenDelTicket(usuario.rol)

  if (status === 'loading') {
    return (
      <Estado titulo="Ticket">
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando el ticket…
          </p>
        </Card>
      </Estado>
    )
  }
  if (error.code === 'TICKET_NOT_FOUND') {
    return (
      <Estado titulo="Ticket no encontrado">
        <MessageCard
          code="404"
          title={`No encontramos el ticket ${codigo.toUpperCase()}`}
          description="Revisa el código: los tickets se identifican como TCK-2026-00147."
          actions={<Button to={origen.to}>Ir a {origen.label}</Button>}
          focusTitle
        />
      </Estado>
    )
  }
  return (
    <Estado titulo="Ticket">
      <Alert
        variant="error"
        actions={
          <Button variant="secondary" size="sm" onClick={onReintentar}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar el ticket.
      </Alert>
    </Estado>
  )
}
