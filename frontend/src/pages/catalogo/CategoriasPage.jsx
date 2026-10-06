import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { cambiarEstado, eliminar, listar } from '../../services/categorias.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, SearchIcon, useToast } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import { nombreDeTipo } from './catalogoFormat.js'
import { CATALOGO_SIN_FILTROS, contarFilas, filtrarCatalogo, paginar } from './catalogoList.js'
import CategoriasTable from './CategoriasTable.jsx'
import { catalogoACsv, descargarCsv, nombreDelArchivo } from './exportarCatalogo.js'
import FiltrosCatalogo from './FiltrosCatalogo.jsx'
import Paginacion from './Paginacion.jsx'
import { useConsultaRefrescable } from './useConsultaRefrescable.js'
import { useEliminacion } from './useEliminacion.js'
import './Paginacion.css'

/** Cada página muestra hasta 10 categorías, siempre con todas sus subcategorías. */
const CATEGORIAS_POR_PAGINA = 10

const contarSubcategorias = (categorias) => categorias.reduce((total, { subcategorias }) => total + subcategorias.length, 0)

/** Resumen de la cabecera (p12): «7 categorías activas · 19 subcategorías · …». */
function resumirCatalogo(categorias) {
  const activas = categorias.filter((categoria) => categoria.activa).length
  return [
    pluralize(activas, 'categoría activa', 'categorías activas'),
    pluralize(contarSubcategorias(categorias), 'subcategoría', 'subcategorías'),
    'la prioridad por defecto se aplica a cada ticket nuevo.',
  ].join(' · ')
}

/** Resultado de activar o desactivar, con lo que significa para los tickets nuevos. */
function mensajeDeEstado(elemento, categoria, activa) {
  const sujeto = `${nombreDeTipo(elemento.tipo, { mayuscula: true })} “${elemento.nombre}”`
  if (!activa) return `${sujeto} desactivada: ya no admite tickets nuevos.`
  if (categoria && !categoria.activa) {
    return `${sujeto} activada. Admitirá tickets nuevos cuando «${categoria.nombre}» esté activa.`
  }
  return `${sujeto} activada: vuelve a admitir tickets nuevos.`
}

/** Carga, error o catálogo vacío (p15); con categorías muestra `children`. */
function CatalogoContent({ status, total, onRetry, children }) {
  if (status === 'loading') {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando el catálogo…
        </p>
      </Card>
    )
  }
  if (status === 'error') {
    return (
      <Alert
        variant="error"
        actions={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar el catálogo de servicios.
      </Alert>
    )
  }
  if (total === 0) {
    return (
      <Card>
        <EmptyState
          title="Aún no hay categorías de servicio"
          description="Crea la primera categoría para que la comunidad pueda registrar tickets. Puedes empezar con Audiovisuales y Redes."
          action={<Button to={ROUTES.supervisorCategoriaNueva}>Crear primera categoría</Button>}
        />
      </Card>
    )
  }
  return children
}

/**
 * Categorías y subcategorías (HU-2 · 2.1, mockup p12): el catálogo en un árbol de dos niveles con su prioridad, tiempo
 * esperado, tickets en curso y estado. Desde aquí se crea, edita y elimina lo que no se usa.
 */
export default function CategoriasPage() {
  const consulta = useConsultaRefrescable(listar)
  const { usuario } = useAuth()
  const toast = useToast()
  const tablaRef = useRef(null)
  const { eliminandoId, eliminar: confirmarYEliminar } = useEliminacion(consulta.refrescar)
  const [cambiandoId, setCambiandoId] = useState(null)
  const [filtros, setFiltros] = useState(CATALOGO_SIN_FILTROS)
  const [pagina, setPagina] = useState(1)
  useDocumentTitle('Categorías de servicio')

  const categorias = consulta.data ?? []
  const filtradas = filtrarCatalogo(categorias, filtros)
  const { pagina: paginaActual, totalPaginas, visibles } = paginar(filtradas, pagina, CATEGORIAS_POR_PAGINA)
  const limpiarFiltros = () => cambiarFiltros(CATALOGO_SIN_FILTROS)
  const ocupado = eliminandoId
    ? { id: eliminandoId, accion: 'eliminar' }
    : cambiandoId && { id: cambiandoId, accion: 'estado' }

  function cambiarFiltros(siguientes) {
    setFiltros(siguientes)
    setPagina(1)
  }

  /** Descarga en CSV lo que muestran los filtros, de todas las páginas. */
  function exportar() {
    descargarCsv(nombreDelArchivo(), catalogoACsv(filtradas))
    toast.success(`Catálogo exportado: ${pluralize(contarFilas(filtradas), 'fila', 'filas')}.`)
  }

  /** Activa o desactiva la fila y devuelve el foco a su botón, que cambia de texto. */
  async function cambiarEstadoElemento(elemento, categoria) {
    const activa = !elemento.activa
    setCambiandoId(elemento.id)
    try {
      await cambiarEstado(elemento.id, activa, usuario.id)
      await consulta.refrescar()
      toast.success(mensajeDeEstado(elemento, categoria, activa))
    } catch (error) {
      toast.error(error.message)
      if (error.status === 404) await consulta.refrescar()
    }
    // El botón se habilita al terminar: se pinta antes de devolverle el foco, que el navegador soltó al deshabilitarlo.
    flushSync(() => setCambiandoId(null))
    tablaRef.current?.querySelector(`[data-estado="${elemento.id}"]`)?.focus()
  }

  async function eliminarElemento(elemento) {
    const tipo = nombreDeTipo(elemento.tipo)
    await confirmarYEliminar({
      id: elemento.id,
      titulo: `¿Eliminar la ${tipo}?`,
      mensaje: `«${elemento.nombre}» se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: `Eliminar ${tipo}`,
      eliminarEnServicio: () => eliminar(elemento.id, usuario.id),
      exito: `${nombreDeTipo(elemento.tipo, { mayuscula: true })} “${elemento.nombre}” eliminada correctamente.`,
    })
    // Su botón ya no existe: el foco pasa a la tabla en vez de perderse.
    tablaRef.current?.focus()
  }

  return (
    <>
      <PageHeader
        title="Categorías de servicio"
        subtitle={consulta.status === 'success' && categorias.length > 0 ? resumirCatalogo(categorias) : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={exportar} disabled={filtradas.length === 0}>
              Exportar catálogo
            </Button>
            <Button to={ROUTES.supervisorCategoriaNueva}>Nueva categoría</Button>
          </>
        }
      />

      <CatalogoContent status={consulta.status} total={categorias.length} onRetry={consulta.reload}>
        <FiltrosCatalogo filtros={filtros} onChange={cambiarFiltros} onLimpiar={limpiarFiltros} />
        {visibles.length > 0 ? (
          <CategoriasTable
            ref={tablaRef}
            categorias={visibles}
            ocupado={ocupado}
            onCambiarEstado={cambiarEstadoElemento}
            onEliminar={eliminarElemento}
          />
        ) : (
          <Card>
            <EmptyState
              icon={<SearchIcon size={24} />}
              title="Ninguna categoría coincide con los filtros"
              description="Prueba con otra prioridad o busca otro nombre."
              action={
                <Button variant="secondary" onClick={limpiarFiltros}>
                  Ver todo el catálogo
                </Button>
              }
            />
          </Card>
        )}
        <div className="catalogo-pie">
          {/* Fuera de la tabla, para anunciar también cuando ningún resultado coincide. */}
          <p className="catalogo-pie__conteo" role="status">
            Mostrando {contarFilas(visibles)} de {pluralize(contarFilas(filtradas), 'fila', 'filas')} ·{' '}
            {pluralize(filtradas.length, 'categoría', 'categorías')} y{' '}
            {pluralize(contarSubcategorias(filtradas), 'subcategoría', 'subcategorías')}
          </p>
          <Paginacion
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            onCambiar={setPagina}
            etiqueta="Páginas del catálogo"
          />
        </div>
      </CatalogoContent>
    </>
  )
}
