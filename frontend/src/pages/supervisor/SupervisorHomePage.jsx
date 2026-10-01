import { useAuth } from '../../hooks/useAuth.js'
import { getFirstName } from '../../utils/format.js'
import { HISTORIAS } from '../placeholders/historias.js'
import PlaceholderPage from '../placeholders/PlaceholderPage.jsx'

/** Vista principal del supervisor («Tablero», /supervisor). El tablero de métricas lo implementa HU-7. */
export default function SupervisorHomePage() {
  const { usuario } = useAuth()

  return (
    <PlaceholderPage
      title="Tablero"
      subtitle={`Te damos la bienvenida, ${getFirstName(usuario.nombres)}. Aquí verás las métricas de atención del área.`}
      pendiente={HISTORIAS.metricas}
    />
  )
}
