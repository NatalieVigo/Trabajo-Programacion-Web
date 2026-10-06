import { Button } from '../../shared/components'
import { formatTipoAmbiente } from './catalogoFormat.js'
import './CatalogoTable.css'

function FilaAmbiente({ ambiente, eliminando, onEditar, onEliminar }) {
  return (
    <tr>
      <th scope="row" className="catalogo-table__name catalogo-table__number">
        {ambiente.codigo}
      </th>
      <td data-label="Nombre">{ambiente.nombre}</td>
      <td data-label="Tipo">{formatTipoAmbiente(ambiente.tipo)}</td>
      <td data-label="Pabellón">{ambiente.pabellonNombre}</td>
      <td data-label="Piso" className="catalogo-table__number">
        {ambiente.piso}
      </td>
      <td data-label="Sede">{ambiente.sedeNombre}</td>
      <td data-label="Capacidad" className="catalogo-table__number">
        {ambiente.capacidad}
      </td>
      <td data-label="Tickets en curso" className="catalogo-table__number">
        {ambiente.ticketsEnCurso}
      </td>
      <td className="catalogo-table__actions">
        <Button variant="tertiary" size="sm" onClick={() => onEditar(ambiente)} disabled={eliminando}>
          Editar <span className="visually-hidden">{ambiente.codigo}</span>
        </Button>
        {ambiente.eliminable && (
          <Button
            variant="tertiary-destructive"
            size="sm"
            onClick={() => onEliminar(ambiente)}
            loading={eliminando}
            loadingText="Eliminando…"
          >
            Eliminar <span className="visually-hidden">{ambiente.codigo}</span>
          </Button>
        )}
      </td>
    </tr>
  )
}

/**
 * Ambientes del campus (p14) con su ubicación, capacidad y tickets en curso. «Eliminar» solo aparece en los que no
 * se usan. `ref` llega a la tabla, para devolverle el foco.
 */
export default function AmbientesTable({ ref, ambientes, eliminandoId, onEditar, onEliminar }) {
  return (
    <div className="catalogo-table">
      <div className="catalogo-table__scroll">
        <table ref={ref} tabIndex={-1}>
          <caption className="visually-hidden">Ambientes registrados</caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nombre</th>
              <th scope="col">Tipo</th>
              <th scope="col">Pabellón</th>
              <th scope="col">Piso</th>
              <th scope="col">Sede</th>
              <th scope="col">Capacidad</th>
              <th scope="col">Tickets en curso</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ambientes.map((ambiente) => (
              <FilaAmbiente
                key={ambiente.id}
                ambiente={ambiente}
                eliminando={eliminandoId === ambiente.id}
                onEditar={onEditar}
                onEliminar={onEliminar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
