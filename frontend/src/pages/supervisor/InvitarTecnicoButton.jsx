import { useState } from 'react'
import { Button } from '../../shared/components'
import NewInvitationModal from './NewInvitationModal.jsx'

/**
 * «Invitar técnico» (HU-1 · 1.2, botón de mockup p16): abre el formulario de la invitación y, al crearla, muestra el
 * enlace con el que la persona invitada activa su cuenta (p07). La entrega 1 no envía correos (enunciado §4).
 */
export default function InvitarTecnicoButton() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Invitar técnico
      </Button>
      <NewInvitationModal open={abierto} onClose={() => setAbierto(false)} />
    </>
  )
}
