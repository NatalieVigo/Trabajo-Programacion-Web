import { useRef, useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { eliminar, listar } from '../../services/categorias.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, useConfirm, useToast } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import { nombreDeTipo } from './catalogoFormat.js'
import CategoriasTable from './CategoriasTable.jsx'
import './CategoriasPage.css'

/** Al eliminar, estos errores indican que el catálogo cambió en otro lado: hay que volver a leerlo. */
const CATALOGO_CAMBIADO = new Set(['IN_USE', 'CATEGORY_NOT_FOUND'])

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
  const consulta = useAsyncData(listar)
  const { usuario } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const tablaRef = useRef(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  useDocumentTitle('Categorías de servicio')

  const categorias = consulta.data ?? []

  /** Vuelve a leer el catálogo sin pasar por «cargando», para que la tabla no desaparezca mientras tanto. */
  async function refrescar() {
    try {
      const actualizado = await listar()
      consulta.updateData(() => actualizado)
    } catch {
      consulta.reload()
    }
  }

  async function eliminarElemento(elemento) {
    const tipo = nombreDeTipo(elemento.tipo)
    const confirmado = await confirm({
      title: `¿Eliminar la ${tipo}?`,
      message: `«${elemento.nombre}» se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: `Eliminar ${tipo}`,
      variant: 'destructive',
    })
    if (!confirmado) return

    setEliminandoId(elemento.id)
    try {
      await eliminar(elemento.id, usuario.id)
      await refrescar()
      toast.success(`${nombreDeTipo(elemento.tipo, { mayuscula: true })} “${elemento.nombre}” eliminada correctamente.`)
    } catch (error) {
      toast.error(error.message)
      if (CATALOGO_CAMBIADO.has(error.code)) await refrescar()
    } finally {
      setEliminandoId(null)
    }
    // Su botón ya no existe: el foco pasa a la tabla en vez de perderse.
    tablaRef.current?.focus()
  }

  return (
    <>
      <PageHeader
        title="Categorías de servicio"
        subtitle={consulta.status === 'success' && categorias.length > 0 ? resumirCatalogo(categorias) : undefined}
        actions={<Button to={ROUTES.supervisorCategoriaNueva}>Nueva categoría</Button>}
      />

      <CatalogoContent status={consulta.status} total={categorias.length} onRetry={consulta.reload}>
        <CategoriasTable
          ref={tablaRef}
          categorias={categorias}
          eliminandoId={eliminandoId}
          onEliminar={eliminarElemento}
        />
        <p className="categorias-page__count">
          {pluralize(categorias.length, 'categoría', 'categorías')} y{' '}
          {pluralize(contarSubcategorias(categorias), 'subcategoría', 'subcategorías')}
        </p>
      </CatalogoContent>
    </>
  )
}
