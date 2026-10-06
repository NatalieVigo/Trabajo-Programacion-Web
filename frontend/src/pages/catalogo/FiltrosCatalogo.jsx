import { useId } from 'react'
import { Button, SelectInput, TextInput } from '../../shared/components'
import { PRIORIDADES } from '../../utils/catalogoValidators.js'
import { formatPrioridad } from '../../utils/format.js'
import './CatalogoFiltros.css'

const OPCIONES_PRIORIDAD = PRIORIDADES.map((prioridad) => ({ value: prioridad, label: formatPrioridad(prioridad) }))

/** Cuántos filtros tienen valor. */
function contarFiltrosActivos({ busqueda, soloActivas, prioridad }) {
  return [busqueda.trim(), soloActivas, prioridad].filter(Boolean).length
}

/**
 * Búsqueda y filtros del catálogo (p12): «Buscar categoría o subcategoría», «Solo activas» y la prioridad. Con algún
 * filtro activo indica cuántos hay y ofrece limpiarlos.
 */
export default function FiltrosCatalogo({ filtros, onChange, onLimpiar }) {
  const id = useId()
  const activos = contarFiltrosActivos(filtros)

  return (
    <div className="catalogo-filtros">
      <div className="catalogo-filtros__busqueda">
        <label htmlFor={`${id}-busqueda`} className="visually-hidden">
          Buscar categoría o subcategoría
        </label>
        <TextInput
          id={`${id}-busqueda`}
          type="search"
          value={filtros.busqueda}
          onChange={(event) => onChange({ ...filtros, busqueda: event.target.value })}
          placeholder="Buscar categoría o subcategoría"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <button
        type="button"
        className="filtro-chip"
        aria-pressed={filtros.soloActivas}
        onClick={() => onChange({ ...filtros, soloActivas: !filtros.soloActivas })}
      >
        Solo activas
        {filtros.soloActivas && <span aria-hidden="true">×</span>}
      </button>
      <div className="catalogo-filtros__select">
        <label htmlFor={`${id}-prioridad`} className="visually-hidden">
          Prioridad
        </label>
        <SelectInput
          id={`${id}-prioridad`}
          value={filtros.prioridad}
          onChange={(event) => onChange({ ...filtros, prioridad: event.target.value })}
          options={OPCIONES_PRIORIDAD}
          placeholder="Prioridad: todas"
        />
      </div>
      {activos > 0 && (
        <p className="catalogo-filtros__activos">
          Filtros activos: {activos} ·{' '}
          <Button variant="tertiary" size="sm" onClick={onLimpiar}>
            Limpiar
          </Button>
        </p>
      )}
    </div>
  )
}
