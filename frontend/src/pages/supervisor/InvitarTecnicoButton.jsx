import { useState } from 'react'
import { Button } from '../../shared/components'
import NewInvitationModal from './NewInvitationModal.jsx'

// Abre la invitación y muestra el enlace de activación (todavía no se mandan correos).
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
