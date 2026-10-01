import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card, PageHeader } from '../../shared/components'
import LoginForm from './LoginForm.jsx'
import './LoginPage.css'

/** Inicio de sesión (HU-1 · 1.3, mockups p04 y p05): formulario y aviso «Acceso por rol». */
export default function LoginPage() {
  useDocumentTitle('Iniciar sesión')

  return (
    <div className="container page login-page">
      <Card className="login-page__card">
        <PageHeader title="Iniciar sesión" subtitle="Ingresa con tu correo institucional." />
        <LoginForm />
      </Card>

      <aside className="login-page__aside" aria-labelledby="acceso-por-rol">
        <h2 id="acceso-por-rol" className="login-page__aside-title">
          Acceso por rol
        </h2>
        <p className="login-page__aside-text">
          Usuarios de la comunidad ingresan con su correo. Técnicos y supervisores reciben una invitación del área de
          Infraestructura y definen su contraseña al aceptarla.
        </p>
        <p className="login-page__note">Tras cinco intentos fallidos la cuenta se bloquea por 15 minutos.</p>
      </aside>
    </div>
  )
}
