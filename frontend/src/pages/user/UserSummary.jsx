import { ROUTES } from '../../routes/routePaths.js'
import { Alert, Button, Card, EmptyState } from '../../shared/components'
import { cx } from '../../utils/classNames.js'

const ESTADISTICAS = [
  {
    clave: 'ticketsAbiertos',
    etiqueta: 'Tickets abiertos',
    detalle: 'Abiertos, en atención, en espera o reabiertos.',
  },
  { clave: 'ticketsReportados', etiqueta: 'Tickets reportados', detalle: 'Todos los que registraste.' },
  {
    clave: 'encuestasPendientes',
    etiqueta: 'Encuestas pendientes',
    detalle: 'Califica la atención hasta 7 días después del cierre.',
    resaltar: true,
  },
  { clave: 'encuestasRespondidas', etiqueta: 'Encuestas respondidas', detalle: 'Tus calificaciones de la atención.' },
]

/** Contadores del usuario en su Inicio, con sus estados de carga, error y vacío (sin tickets reportados). */
export default function UserSummary({ status, data: contadores, reload }) {
  if (status === 'loading') {
    return (
      <>
        <p className="visually-hidden" role="status">
          Cargando tu resumen…
        </p>
        <div className="user-summary" aria-hidden="true">
          {ESTADISTICAS.map(({ clave }) => (
            <div key={clave} className="user-stat user-stat--placeholder" />
          ))}
        </div>
      </>
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

  if (contadores.ticketsReportados === 0) {
    return (
      <Card>
        <EmptyState
          titleAs="h3"
          title="Aún no registras tickets"
          description="Cuando reportes una falla del campus, aquí verás cuántos tickets siguen abiertos y qué encuestas tienes por responder."
          action={<Button to={ROUTES.usuarioNuevoTicket}>Registrar un ticket</Button>}
        />
      </Card>
    )
  }

  return (
    <dl className="user-summary">
      {ESTADISTICAS.map(({ clave, etiqueta, detalle, resaltar }) => (
        <div key={clave} className={cx('user-stat', resaltar && contadores[clave] > 0 && 'user-stat--alerta')}>
          <dt className="user-stat__label">{etiqueta}</dt>
          <dd className="user-stat__value">{contadores[clave]}</dd>
          <dd className="user-stat__detail">{detalle}</dd>
        </div>
      ))}
    </dl>
  )
}
