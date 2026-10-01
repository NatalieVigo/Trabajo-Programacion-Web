import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card, PageHeader } from '../../shared/components'
import AccountSummary from './AccountSummary.jsx'
import ChangePasswordSection from './ChangePasswordSection.jsx'
import PersonalDataSection from './PersonalDataSection.jsx'
import './AccountPage.css'

/**
 * Mi cuenta (HU-1 · 1.5 y 1.6, mockup p10), para cualquier rol: la tarjeta principal reúne las secciones de la cuenta
 * (datos personales y cambio de contraseña) y la columna lateral, el perfil con su resumen.
 */
export default function AccountPage() {
  const { usuario } = useAuth()
  useDocumentTitle('Mi cuenta')

  return (
    <div className="account-page">
      <PageHeader title="Mi cuenta" subtitle="Tus datos se usan para contactarte durante la atención de un ticket." />
      <div className="account-page__layout">
        <Card className="account-page__card">
          <PersonalDataSection usuario={usuario} />
          <ChangePasswordSection usuario={usuario} />
        </Card>
        <AccountSummary usuario={usuario} />
      </div>
    </div>
  )
}
