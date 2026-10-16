import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { solicitar } from '../../services/solicitudesAcceso.service.js'
import { Button, useToast } from '../../shared/components'

/**
 * «Solicitar acceso» de la vista 403 (p11): envía a Infraestructura y Servicios la solicitud del `recurso` y notifica
 * el resultado. El botón conserva el texto de p11; si la cuenta ya la había enviado (409), lo avisa.
 */
export default function AccessRequestButton({ recurso }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const [enviando, setEnviando] = useState(false)

  async function handleClick() {
    setEnviando(true)
    try {
      await solicitar(usuario.id, recurso)
      toast.success('Enviamos tu solicitud a Infraestructura y Servicios.')
    } catch (error) {
      if (error.code === 'ACCESS_REQUEST_EXISTS') toast.info(error.message)
      else toast.error(error.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Button variant="secondary" onClick={handleClick} loading={enviando} loadingText="Enviando solicitud…">
      Solicitar acceso
    </Button>
  )
}
