import { categoriaEditarPath } from '../../routes/routePaths.js'
import { Badge, Button, PriorityBadge } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import { formatHoras } from './catalogoFormat.js'
import './CatalogoTable.css'

/** Activa o inactiva; una subcategoría activa de una categoría inactiva no admite tickets nuevos y se indica. */
function Estado({ elemento }) {
  if (!elemento.activa) return <Badge tone="neutral">Inactiva</Badge>
  if (elemento.tipo === 'subcategoria' && !elemento.disponible) {
    return (
      <>
        <Badge tone="neutral">Activa</Badge> <span className="catalogo-table__nota">· categoría inactiva</span>
      </>
    )
  }
  return <Badge tone="success">Activa</Badge>
}

function FilaCatalogo({ elemento, categoria, ocupadoId, accion, onCambiarEstado, onEliminar }) {
  const esSubcategoria = elemento.tipo === 'subcategoria'
  const ocupado = ocupadoId === elemento.id

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
        <Estado elemento={elemento} />
      </td>
      <td className="catalogo-table__actions">
        <Button to={categoriaEditarPath(elemento.id)} variant="tertiary" size="sm" disabled={ocupado}>
          Editar <span className="visually-hidden">{elemento.nombre}</span>
        </Button>
        <Button
          variant={elemento.activa ? 'tertiary-destructive' : 'tertiary'}
          size="sm"
          data-estado={elemento.id}
          onClick={() => onCambiarEstado(elemento, categoria)}
          disabled={ocupado && accion !== 'estado'}
          loading={ocupado && accion === 'estado'}
          loadingText={elemento.activa ? 'Desactivando…' : 'Activando…'}
        >
          {elemento.activa ? 'Desactivar' : 'Activar'} <span className="visually-hidden">{elemento.nombre}</span>
        </Button>
        {elemento.eliminable && (
          <Button
            variant="tertiary-destructive"
            size="sm"
            onClick={() => onEliminar(elemento)}
            disabled={ocupado && accion !== 'eliminar'}
            loading={ocupado && accion === 'eliminar'}
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
 * subcategorías. Cada fila se edita, se activa o desactiva y, si no se usa, se elimina. `ocupado` ({ id, accion })
 * indica la fila que espera una respuesta. `ref` llega a la tabla, para devolverle el foco.
 */
export default function CategoriasTable({ ref, categorias, ocupado, onCambiarEstado, onEliminar }) {
  const filaProps = { ocupadoId: ocupado?.id, accion: ocupado?.accion, onCambiarEstado, onEliminar }

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
              <FilaCatalogo elemento={categoria} {...filaProps} />
              {categoria.subcategorias.map((subcategoria) => (
                <FilaCatalogo key={subcategoria.id} elemento={subcategoria} categoria={categoria} {...filaProps} />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
