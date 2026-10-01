import { useCallback, useId } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { ROUTES } from '../../routes/routePaths.js'
import { obtenerResumenCuenta } from '../../services/usuarios.service.js'
import { Alert, Avatar, Button, Card, CheckIcon, EmptyState } from '../../shared/components'
import { formatDate, formatRol, getFullName } from '../../utils/format.js'
import './AccountSummary.css'

const CUENTA_CREADA = { clave: 'cuentaCreada', etiqueta: 'Cuenta creada', formato: formatDate }

const FILAS_POR_ROL = {
  usuario: [
    { clave: 'ticketsReportados', etiqueta: 'Tickets reportados' },
    { clave: 'abiertosAhora', etiqueta: 'Abiertos ahora' },
    CUENTA_CREADA,
  ],
  tecnico: [
    { clave: 'ticketsAsignados', etiqueta: 'Tickets asignados' },
    { clave: 'enAtencion', etiqueta: 'En atención' },
    CUENTA_CREADA,
  ],
  supervisor: [{ clave: 'invitacionesPendientes', etiqueta: 'Invitaciones pendientes' }, CUENTA_CREADA],
}

/** «Usuario · estudiante»: el rol y, si lo tiene, el vínculo con la universidad. */
function describirPerfil({ rol, vinculo }) {
  return vinculo ? `${formatRol(rol)} · ${vinculo.toLowerCase()}` : formatRol(rol)
}

function ResumenFilas({ rol, status, data: resumen, reload }) {
  if (status === 'loading') {
    return (
      <p role="status" className="text-aux text-muted">
        Cargando tu resumen…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <Alert
        variant="error"
        actions={
          <Button variant="secondary" size="sm" onClick={reload}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar tu resumen.
      </Alert>
    )
  }
  return (
    <dl className="profile-card__stats">
      {FILAS_POR_ROL[rol].map(({ clave, etiqueta, formato }) => (
        <div key={clave} className="profile-card__stat">
          <dt>{etiqueta}</dt>
          <dd>{formato ? formato(resumen[clave]) : resumen[clave]}</dd>
        </div>
      ))}
    </dl>
  )
}

function EncuestaPendiente({ encuesta }) {
  const tituloId = useId()

  if (!encuesta) {
    return (
      <Card>
        <EmptyState
          compact
          icon={<CheckIcon size={20} />}
          title="No tienes encuestas pendientes."
          description="Cuando se cierre uno de tus tickets podrás calificar la atención durante 7 días."
        />
      </Card>
    )
  }

  const cierre = formatDate(encuesta.cerradoEn)
  const limite = formatDate(encuesta.fechaLimite)
  return (
    <section className="pending-survey" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="pending-survey__title">
        Encuesta pendiente
      </h2>
      <p className="pending-survey__text">
        El ticket <span className="text-mono">{encuesta.ticketCodigo}</span> se cerró el {cierre}. Califica la atención
        antes del {limite}.
      </p>
      <Button to={ROUTES.usuarioEncuestaPendiente} size="sm" className="pending-survey__action">
        Responder encuesta
      </Button>
    </section>
  )
}

/**
 * Columna lateral de Mi cuenta (p10): tarjeta de perfil con el resumen de la cuenta según el rol y, para el usuario,
 * su encuesta pendiente (o un estado vacío si no tiene).
 */
export default function AccountSummary({ usuario }) {
  const cargarResumen = useCallback(() => obtenerResumenCuenta(usuario.id), [usuario.id])
  const resumen = useAsyncData(cargarResumen)

  return (
    <aside className="account-summary" aria-label="Resumen de tu cuenta">
      <Card className="profile-card" aria-busy={resumen.status === 'loading'}>
        <div className="profile-card__header">
          <Avatar nombres={usuario.nombres} apellidos={usuario.apellidos} tone="primary" />
          <div className="profile-card__identity">
            <h2 className="profile-card__name">{getFullName(usuario)}</h2>
            <p className="profile-card__role">{describirPerfil(usuario)}</p>
          </div>
        </div>
        <ResumenFilas rol={usuario.rol} {...resumen} />
      </Card>

      {usuario.rol === 'usuario' && resumen.status === 'success' && (
        <EncuestaPendiente encuesta={resumen.data.encuestaPendiente} />
      )}
    </aside>
  )
}
