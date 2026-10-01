import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card, PageHeader } from '../../shared/components'
import RegisterForm from './RegisterForm.jsx'
import './RegisterPage.css'

/** Registro de usuario (HU-1 · 1.1, mockup p06): formulario y aviso «Antes de registrarte». */
export default function RegisterPage() {
  useDocumentTitle('Crear mi cuenta')

  return (
    <div className="container page register-page">
      <Card className="register-page__card">
        <PageHeader title="Crear mi cuenta" subtitle="Solo para miembros de la comunidad con correo institucional." />
        <RegisterForm />
      </Card>

      <Card as="aside" className="register-page__aside" aria-labelledby="antes-de-registrarte">
        <h2 id="antes-de-registrarte" className="register-page__aside-title">
          Antes de registrarte
        </h2>
        <p className="register-page__aside-text">
          Si eres técnico o supervisor no uses este formulario: el área de Infraestructura te envía una invitación con
          tus datos precargados.
        </p>
        <p className="register-page__aside-text">
          Tu cuenta queda activa al instante; el correo de bienvenida llega en pocos minutos.
        </p>
      </Card>
    </div>
  )
}
