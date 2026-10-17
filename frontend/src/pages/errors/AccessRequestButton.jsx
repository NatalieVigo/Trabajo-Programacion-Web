import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { solicitar } from '../../services/solicitudesAcceso.service.js'
import { Button, useToast } from '../../shared/components'

// si ya había pedido acceso antes solo se le avisa
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
