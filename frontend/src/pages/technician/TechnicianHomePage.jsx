import { useAuth } from '../../hooks/useAuth.js'
import { getFirstName } from '../../utils/format.js'
import { HISTORIAS } from '../placeholders/historias.js'
import PlaceholderPage from '../placeholders/PlaceholderPage.jsx'

/** Vista principal del técnico («Mi bandeja», /tecnico). La bandeja de tickets asignados la implementa HU-4. */
export default function TechnicianHomePage() {
  const { usuario } = useAuth()

  return (
    <PlaceholderPage
      title="Mi bandeja"
      subtitle={`Te damos la bienvenida, ${getFirstName(usuario.nombres)}. Aquí verás los tickets que te asignen y su avance.`}
      pendiente={HISTORIAS.cola}
    />
  )
}
