import { useAsyncData } from '../../hooks/useAsyncData.js'
import { LANDING_SECTIONS } from '../../routes/routePaths.js'
import { listarCategorias } from '../../services/catalogo.service.js'
import { Alert, Button, Card, EmptyState, PriorityBadge } from '../../shared/components'

const cargarCategoriasActivas = () => listarCategorias({ soloActivas: true })
const PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => index)

/** Catálogo público de categorías (datos de HU-2 leídos con catalogo.service). */
export default function CategoriasSection() {
  const { status, data: categorias, reload } = useAsyncData(cargarCategoriasActivas)

  return (
    <section
      id={LANDING_SECTIONS.categorias}
      className="landing-section"
      aria-labelledby="categorias-titulo"
      aria-busy={status === 'loading'}
      tabIndex={-1}
    >
      <div className="landing-section__header">
        <h2 id="categorias-titulo" className="landing-section__title">
          Categorías de servicio
        </h2>
        <p className="landing-section__subtitle">
          Elige la categoría que mejor describe la falla al registrar tu ticket.
        </p>
      </div>

      {status === 'loading' && (
        <>
          <p className="visually-hidden" role="status">
            Cargando categorías…
          </p>
          <ul className="category-grid" aria-hidden="true">
            {PLACEHOLDERS.map((index) => (
              <li key={index} className="category-card category-card--placeholder" />
            ))}
          </ul>
        </>
      )}

      {status === 'error' && (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar las categorías de servicio.
        </Alert>
      )}

      {status === 'success' && categorias.length === 0 && (
        <Card>
          <EmptyState
            titleAs="h3"
            title="Aún no hay categorías disponibles"
            description="Cuando el área de Infraestructura publique su catálogo de servicios, lo verás aquí."
          />
        </Card>
      )}

      {status === 'success' && categorias.length > 0 && (
        <ul className="category-grid">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="category-card">
              <h3 className="category-card__title">{categoria.nombre}</h3>
              {categoria.descripcion && <p className="category-card__text">{categoria.descripcion}</p>}
              <p className="category-card__meta">
                <span>Prioridad sugerida</span>
                <PriorityBadge prioridad={categoria.prioridadPorDefecto} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
