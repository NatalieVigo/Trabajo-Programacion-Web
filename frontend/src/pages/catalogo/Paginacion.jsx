import { Button } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import './Paginacion.css'

/** «Anterior · 1 · 2 · Siguiente» (p12, p14). No se muestra si todo cabe en una página. */
export default function Paginacion({ pagina, totalPaginas, onCambiar, etiqueta }) {
  if (totalPaginas <= 1) return null
  const paginas = Array.from({ length: totalPaginas }, (_, indice) => indice + 1)

  return (
    <nav aria-label={etiqueta} className="paginacion">
      <Button variant="secondary" size="sm" disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
        Anterior
      </Button>
      <ol className="paginacion__paginas">
        {paginas.map((numero) => (
          <li key={numero}>
            <button
              type="button"
              className={cx('paginacion__pagina', numero === pagina && 'is-current')}
              aria-current={numero === pagina ? 'page' : undefined}
              aria-label={`Página ${numero}`}
              onClick={() => onCambiar(numero)}
            >
              {numero}
            </button>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" disabled={pagina === totalPaginas} onClick={() => onCambiar(pagina + 1)}>
        Siguiente
      </Button>
    </nav>
  )
}
