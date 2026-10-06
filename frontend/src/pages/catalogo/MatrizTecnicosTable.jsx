import { useId } from 'react'
import { cx } from '../../utils/classNames.js'
import { getDisplayName, pluralize } from '../../utils/format.js'
import { nombreCorto } from './matrizTecnicos.js'
import './MatrizTecnicosTable.css'

/**
 * Matriz técnico × categoría (p16): una casilla por categoría para habilitar al técnico en ella, más la especialidad
 * que declaró y su carga actual. Las casillas marcadas resaltan su celda. `onAlternar(tecnicoId, categoriaId)`.
 */
export default function MatrizTecnicosTable({ categorias, tecnicos, habilitadas, deshabilitada, onAlternar }) {
  const idBase = useId()
  const nombres = new Map(categorias.map(({ id, nombre }) => [id, nombre]))

  return (
    <div className="matriz-tecnicos">
      <div className="matriz-tecnicos__scroll">
        <table>
          <caption className="visually-hidden">Categorías habilitadas por técnico</caption>
          <thead>
            <tr>
              <th scope="col" className="matriz-tecnicos__tecnico">
                Técnico
              </th>
              <th scope="col">Especialidad declarada</th>
              <th scope="col">Carga actual</th>
              {categorias.map((categoria) => (
                <th
                  key={categoria.id}
                  scope="col"
                  className={cx('matriz-tecnicos__categoria', !categoria.activa && 'is-inactiva')}
                >
                  <span aria-hidden="true" title={categoria.nombre}>
                    {nombreCorto(categoria.nombre)}
                  </span>
                  <span className="visually-hidden">
                    {categoria.nombre}
                    {categoria.activa ? '' : ' (inactiva)'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((tecnico) => {
              const nombre = getDisplayName(tecnico)
              const propias = habilitadas[tecnico.id] ?? []
              return (
                <tr key={tecnico.id}>
                  <th scope="row" className="matriz-tecnicos__tecnico">
                    {nombre}
                  </th>
                  <td className="matriz-tecnicos__muted matriz-tecnicos__especialidad">
                    {tecnico.especialidades.map((id) => nombres.get(id)).join(', ')}
                  </td>
                  <td className="matriz-tecnicos__carga">{pluralize(tecnico.carga, 'ticket', 'tickets')}</td>
                  {categorias.map((categoria) => {
                    const id = `${idBase}-${tecnico.id}-${categoria.id}`
                    const marcada = propias.includes(categoria.id)
                    return (
                      <td key={categoria.id} className={cx('matriz-tecnicos__celda', marcada && 'is-habilitada')}>
                        <input
                          id={id}
                          type="checkbox"
                          className="matriz-tecnicos__casilla"
                          checked={marcada}
                          disabled={deshabilitada}
                          onChange={() => onAlternar(tecnico.id, categoria.id)}
                        />
                        <label htmlFor={id} className="visually-hidden">
                          Habilitar a {nombre} en {categoria.nombre}
                        </label>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
