import { useAsyncData } from '../../hooks/useAsyncData.js'
import { listarCategorias } from '../../services/catalogo.service.js'
import { Alert, Button, ChipToggleGroup } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import { MAX_ESPECIALIDADES } from '../../utils/validators.js'

const cargarCategoriasActivas = () => listarCategorias({ soloActivas: true })

/** Texto de apoyo mientras no hay categorías que elegir. */
function avisoCategorias({ status, data }) {
  if (status === 'loading') return 'Cargando categorías…'
  if (status === 'success' && data.length === 0) {
    return 'Aún no hay categorías activas. Pide al supervisor que active al menos una.'
  }
  return undefined
}

/** Especialidad de un técnico o supervisor (p07): de una a tres categorías activas del catálogo (HU-2). */
export default function EspecialidadesField({ value, onChange, onBlur, error, className }) {
  const categorias = useAsyncData(cargarCategoriasActivas)
  const options = categorias.data?.map((categoria) => ({ value: categoria.id, label: categoria.nombre })) ?? []

  return (
    <div className={cx('especialidades-field', className)}>
      {categorias.status === 'error' && (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={categorias.reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar las categorías de servicio.
        </Alert>
      )}
      <ChipToggleGroup
        name="especialidades"
        label="Especialidad · Elige hasta tres categorías"
        options={options}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        max={MAX_ESPECIALIDADES}
        maxMessage="Ya elegiste tres categorías. Quita una para elegir otra."
        hint={avisoCategorias(categorias)}
        error={error}
      />
    </div>
  )
}
