import { categoriaEditarPath } from '../../routes/routePaths.js'
import { Badge, Button, PriorityBadge } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import { formatHoras } from './catalogoFormat.js'
import './CatalogoTable.css'

function FilaCatalogo({ elemento, categoria, eliminando, onEliminar }) {
  const esSubcategoria = elemento.tipo === 'subcategoria'

  return (
    <tr className={cx(esSubcategoria && 'catalogo-table__row--sub')}>
      <th scope="row" className="catalogo-table__name">
        {elemento.nombre}
        {esSubcategoria && (
          <>
            {' '}
            <span className="visually-hidden">(subcategoría de {categoria.nombre})</span>
          </>
        )}
      </th>
      <td data-label="Prioridad">
        <PriorityBadge prioridad={elemento.prioridadPorDefecto} />
      </td>
      <td data-label="Tiempo esperado">{formatHoras(elemento.tiempoEsperadoHoras)}</td>
      <td data-label="Tickets en curso" className="catalogo-table__number">
        {elemento.ticketsEnCurso}
      </td>
      <td data-label="Estado">
        <Badge tone={elemento.activa ? 'success' : 'neutral'}>{elemento.activa ? 'Activa' : 'Inactiva'}</Badge>
      </td>
      <td className="catalogo-table__actions">
        <Button to={categoriaEditarPath(elemento.id)} variant="tertiary" size="sm" disabled={eliminando}>
          Editar <span className="visually-hidden">{elemento.nombre}</span>
        </Button>
        {elemento.eliminable && (
          <Button
            variant="tertiary-destructive"
            size="sm"
            onClick={() => onEliminar(elemento)}
            loading={eliminando}
            loadingText="Eliminando…"
          >
            Eliminar <span className="visually-hidden">{elemento.nombre}</span>
          </Button>
        )}
      </td>
    </tr>
  )
}

/**
 * Catálogo en un árbol de dos niveles (p12): cada categoría encabeza su grupo de filas y debajo, con sangría, sus
 * subcategorías. «Eliminar» solo aparece en lo que no se usa. `ref` llega a la tabla, para devolverle el foco.
 */
export default function CategoriasTable({ ref, categorias, eliminandoId, onEliminar }) {
  return (
    <div className="catalogo-table">
      <div className="catalogo-table__scroll">
        <table ref={ref} tabIndex={-1}>
          <caption className="visually-hidden">Catálogo de servicios</caption>
          <thead>
            <tr>
              <th scope="col">Categoría · subcategoría</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Tiempo esperado</th>
              <th scope="col">Tickets en curso</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          {categorias.map((categoria) => (
            <tbody key={categoria.id}>
              <FilaCatalogo elemento={categoria} eliminando={eliminandoId === categoria.id} onEliminar={onEliminar} />
              {categoria.subcategorias.map((subcategoria) => (
                <FilaCatalogo
                  key={subcategoria.id}
                  elemento={subcategoria}
                  categoria={categoria}
                  eliminando={eliminandoId === subcategoria.id}
                  onEliminar={onEliminar}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
