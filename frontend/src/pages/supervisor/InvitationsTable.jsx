import { Badge, Button } from '../../shared/components'
import { formatDate, formatRol, getFullName } from '../../utils/format.js'
import './InvitationsTable.css'

const ESTADOS = {
  pendiente: { tone: 'info', label: 'Pendiente' },
  aceptada: { tone: 'success', label: 'Aceptada' },
  vencida: { tone: 'warning', label: 'Vencida' },
  rechazada: { tone: 'danger', label: 'Rechazada' },
  revocada: { tone: 'neutral', label: 'Revocada' },
}

const ROL_TONES = { tecnico: 'accent', supervisor: 'primary' }

function InvitationRow({ invitacion, revocando, onCopiar, onRevocar }) {
  const nombre = getFullName(invitacion)
  const estado = ESTADOS[invitacion.estadoEfectivo]

  return (
    <tr data-invitacion={invitacion.id} tabIndex={-1}>
      <th scope="row" className="invitations-table__name">
        {nombre}
      </th>
      <td data-label="Correo" className="invitations-table__correo">
        {invitacion.correo}
      </td>
      <td data-label="Rol">
        <Badge tone={ROL_TONES[invitacion.rol]}>{formatRol(invitacion.rol)}</Badge>
      </td>
      <td data-label="Estado">
        <Badge tone={estado.tone}>{estado.label}</Badge>
      </td>
      <td data-label="Creada">{formatDate(invitacion.creadaEn)}</td>
      <td data-label="Vence">{formatDate(invitacion.venceEn)}</td>
      <td className="invitations-table__actions">
        {invitacion.estadoEfectivo === 'pendiente' && (
          <>
            <Button variant="tertiary" size="sm" onClick={() => onCopiar(invitacion)} disabled={revocando}>
              Copiar enlace <span className="visually-hidden">de {nombre}</span>
            </Button>
            <Button
              variant="tertiary-destructive"
              size="sm"
              onClick={() => onRevocar(invitacion)}
              loading={revocando}
              loadingText="Revocando…"
            >
              Revocar <span className="visually-hidden">la invitación de {nombre}</span>
            </Button>
          </>
        )}
      </td>
    </tr>
  )
}

/**
 * Invitaciones en una tabla compacta (filas de 44 px, p33) que por debajo de 768 px se apila en tarjetas. Solo las
 * pendientes ofrecen «Copiar enlace» y «Revocar». `ref` llega a la tabla, para devolver el foco a una fila.
 */
export default function InvitationsTable({ ref, invitaciones, revocandoId, onCopiar, onRevocar }) {
  return (
    <div className="invitations-table">
      <div className="invitations-table__scroll">
        <table ref={ref}>
          <caption className="visually-hidden">Invitaciones enviadas</caption>
          <thead>
            <tr>
              <th scope="col">Invitado</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Creada</th>
              <th scope="col">Vence</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invitaciones.map((invitacion) => (
              <InvitationRow
                key={invitacion.id}
                invitacion={invitacion}
                revocando={revocandoId === invitacion.id}
                onCopiar={onCopiar}
                onRevocar={onRevocar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
