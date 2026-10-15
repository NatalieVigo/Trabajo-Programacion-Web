import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card } from '../../shared/components'
import RecoveryEmailForm from './RecoveryEmailForm.jsx'
import RecoveryLinkSent from './RecoveryLinkSent.jsx'
import RecoveryStepper from './RecoveryStepper.jsx'
import SimulatedInbox from './SimulatedInbox.jsx'
import './PasswordRecovery.css'

/**
 * Recuperar contraseña (HU-1 · 1.6, mockups p08 y p09): el paso 1 pide el correo, que puede llegar precargado desde
 * el inicio de sesión (?correo=), y el paso 2 confirma el envío junto a la bandeja simulada de la entrega 1.
 */
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
