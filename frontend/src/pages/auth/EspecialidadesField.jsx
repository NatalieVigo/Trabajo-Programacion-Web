import { useCallback } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { obtenerCategorias } from '../../services/invitaciones.service.js'
import { Alert, Button, ChipToggleGroup } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import { MAX_ESPECIALIDADES } from '../../utils/validators.js'

function avisoCategorias({ status, data }) {
  if (status === 'loading') return 'Cargando categorías…'
  if (status === 'success' && data.length === 0) {
    return 'Aún no hay categorías activas. Pide al supervisor que active al menos una.'
  }
  return undefined
}

// de una a tres categorías activas del catálogo de HU-2, que la API da con el token de la invitación
export default function EspecialidadesField({ token, value, onChange, onBlur, error, className }) {
  const cargarCategorias = useCallback(() => obtenerCategorias(token), [token])
  const categorias = useAsyncData(cargarCategorias)
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
