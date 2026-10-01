import { useId } from 'react'
import { Button, TextInput } from '../../shared/components'
import { FILTROS_ESTADO } from './invitationsList.js'
import './InvitationFilters.css'

/**
 * Filtros de la lista de invitaciones (p22, p33): el estado, con la cantidad de cada uno, y la búsqueda por nombre o
 * correo. `onChange` recibe los filtros completos; «Limpiar filtros» aparece cuando alguno está activo.
 */
export default function InvitationFilters({ filtros, conteo, onChange, onClear }) {
  const id = useId()
  const searchId = `${id}-busqueda`
  const activos = filtros.estado !== '' || filtros.busqueda !== ''

  return (
    <div className="invitation-filters">
      <fieldset className="estado-filter">
        <legend className="visually-hidden">Estado de la invitación</legend>
        {FILTROS_ESTADO.map(({ value, label }) => (
          <label key={label} className="estado-filter__option">
            <input
              type="radio"
              name={`${id}-estado`}
              value={value}
              checked={filtros.estado === value}
              onChange={() => onChange({ ...filtros, estado: value })}
              className="estado-filter__input"
            />
            {label} <span className="estado-filter__count">{conteo[value]}</span>
          </label>
        ))}
      </fieldset>

      <div className="invitation-filters__search">
        <label htmlFor={searchId} className="visually-hidden">
          Buscar por nombre o correo
        </label>
        <TextInput
          id={searchId}
          type="search"
          value={filtros.busqueda}
          onChange={(event) => onChange({ ...filtros, busqueda: event.target.value })}
          placeholder="Buscar por nombre o correo"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {activos && (
        <Button variant="tertiary" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
