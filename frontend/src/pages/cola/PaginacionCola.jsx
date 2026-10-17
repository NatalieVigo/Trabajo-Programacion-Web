import { Button } from '../../shared/components'

export default function PaginacionCola({ pagina, total, porPagina, onPagina }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total ? (pagina - 1) * porPagina + 1 : 0
  const hasta = Math.min(pagina * porPagina, total)

  return (
    <div className="cola-paginacion">
      <span>
        Mostrando {desde}–{hasta} de {total} tickets
      </span>
      <nav aria-label="Páginas de la cola">
        <Button
          variant="secondary"
          size="sm"
          disabled={pagina === 1}
          onClick={() => onPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {pagina} de {paginas}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={pagina === paginas}
          onClick={() => onPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </div>
  )
}
