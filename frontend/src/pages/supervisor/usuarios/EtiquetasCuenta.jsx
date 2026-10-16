import { Badge } from '../../../shared/components'
import { formatRol } from '../../../utils/format.js'

export function RolCuenta({ rol }) {
  return <Badge tone={rol === 'tecnico' ? 'accent' : rol === 'supervisor' ? 'primary' : 'info'}>{formatRol(rol)}</Badge>
}

export function EstadoCuenta({ estado }) {
  const nombre = { activo: 'Activo', bloqueado: 'Bloqueado', inactivo: 'Inactivo' }
  return <Badge tone={estado === 'activo' ? 'success' : estado === 'bloqueado' ? 'danger' : 'neutral'}>{nombre[estado] ?? estado}</Badge>
}
