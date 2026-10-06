import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { listar, obtener } from '../../services/categorias.service.js'
import { Alert, Button, Card, MessageCard } from '../../shared/components'
import CategoriaForm from './CategoriaForm.jsx'

/** Las categorías (posibles padres) y, al editar, el elemento: { categorias, elemento }. */
function cargarFormulario(id) {
  return Promise.all([listar(), id ? obtener(id) : null]).then(([categorias, elemento]) => ({ categorias, elemento }))
}

/** Contenido mientras no hay formulario que mostrar, con el título de pestaña que le corresponde. */
function EstadoDelFormulario({ titulo, children }) {
  useDocumentTitle(titulo)
  return children
}

/**
 * /supervisor/categorias/nueva y /supervisor/categorias/:id/editar (HU-2 · 2.1, mockup p13). Carga lo que necesita
 * el formulario; si la categoría ya no existe, lo indica con un 404.
 */
export default function CategoriaFormPage() {
  const { id } = useParams()
  const cargar = useCallback(() => cargarFormulario(id), [id])
  const { status, data, error, reload } = useAsyncData(cargar)

  if (status === 'loading') {
    return (
      <EstadoDelFormulario titulo={id ? 'Editar categoría' : 'Nueva categoría'}>
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando la categoría…
          </p>
        </Card>
      </EstadoDelFormulario>
    )
  }
  if (status === 'error' && error.code === 'CATEGORY_NOT_FOUND') {
    return (
      <EstadoDelFormulario titulo="Categoría no encontrada">
        <MessageCard
          code="404"
          title="No encontramos esta categoría"
          description="Puede que se haya eliminado o que el enlace esté incompleto."
          actions={<Button to={ROUTES.supervisorCategorias}>Volver a las categorías</Button>}
          focusTitle
        />
      </EstadoDelFormulario>
    )
  }
  if (status === 'error') {
    return (
      <EstadoDelFormulario titulo={id ? 'Editar categoría' : 'Nueva categoría'}>
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar el formulario de la categoría.
        </Alert>
      </EstadoDelFormulario>
    )
  }
  // La clave reinicia el formulario al pasar de editar un elemento a otro.
  return <CategoriaForm key={data.elemento?.id ?? 'nueva'} categorias={data.categorias} elemento={data.elemento} />
}
