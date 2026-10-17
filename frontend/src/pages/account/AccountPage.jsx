import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { Card, PageHeader } from '../../shared/components'
import AccountSummary from './AccountSummary.jsx'
import ChangePasswordSection from './ChangePasswordSection.jsx'
import PersonalDataSection from './PersonalDataSection.jsx'
import './AccountPage.css'

// Mi cuenta (HU-1), la misma página para todos los roles.
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
