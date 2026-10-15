import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { solicitar } from '../../services/solicitudesAcceso.service.js'
import { Button, useToast } from '../../shared/components'

/**
 * «Solicitar acceso» de la vista 403 (p11): envía a Infraestructura y Servicios la solicitud del `recurso` y queda
 * deshabilitado como «Solicitud enviada», también si la cuenta ya la había enviado antes (409).
 */
export default function AccessRequestButton({ recurso }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const [estado, setEstado] = useState('inicial')

  async function handleClick() {
    setEstado('enviando')
    try {
      await solicitar(usuario.id, recurso)
      toast.success('Enviamos tu solicitud a Infraestructura y Servicios.')
      setEstado('enviada')
    } catch (error) {
      if (error.code === 'ACCESS_REQUEST_EXISTS') {
        toast.info(error.message)
        setEstado('enviada')
        return
      }
      toast.error(error.message)
      setEstado('inicial')
    }
  }

  if (estado === 'enviada') {
    return (
      <Button variant="secondary" disabled>
        Solicitud enviada
      </Button>
    )
  }
  return (
    <Button variant="secondary" onClick={handleClick} loading={estado === 'enviando'} loadingText="Enviando solicitud…">
      Solicitar acceso
    </Button>
  )
}
