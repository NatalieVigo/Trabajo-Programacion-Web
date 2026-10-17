import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card } from '../../shared/components'
import RecoveryEmailForm from './RecoveryEmailForm.jsx'
import RecoveryLinkSent from './RecoveryLinkSent.jsx'
import RecoveryStepper from './RecoveryStepper.jsx'
import SimulatedInbox from './SimulatedInbox.jsx'
import './PasswordRecovery.css'

// Recuperar contraseña (HU-1). El correo puede venir del login en ?correo=.
export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const [envio, setEnvio] = useState(null)
  useDocumentTitle('Recuperar mi contraseña')

  return (
    <div className="container page recovery-page">
      <Card className="recovery-page__card">
        <RecoveryStepper current={envio ? 2 : 1} />
        {envio ? (
          <RecoveryLinkSent correo={envio.correo} onReenviado={setEnvio} />
        ) : (
          <RecoveryEmailForm correoInicial={searchParams.get('correo') ?? ''} onEnviado={setEnvio} />
        )}
      </Card>
      {envio && <SimulatedInbox tokenDemo={envio.tokenDemo} />}
    </div>
  )
}
