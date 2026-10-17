import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { listar, obtener } from '../../services/categorias.service.js'
import { Alert, Button, Card, MessageCard } from '../../shared/components'
import CategoriaForm from './CategoriaForm.jsx'

function cargarFormulario(id) {
  return Promise.all([listar(), id ? obtener(id) : null]).then(([categorias, elemento]) => ({ categorias, elemento }))
}

// solo sirve para poner el título de la pestaña en cada estado
function EstadoDelFormulario({ titulo, children }) {
  useDocumentTitle(titulo)
  return children
}

// Página para crear o editar una categoría (HU-2). Si ya no existe, muestra un 404.
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
  // con la key el formulario se reinicia al pasar de un elemento a otro
  return <CategoriaForm key={data.elemento?.id ?? 'nueva'} categorias={data.categorias} elemento={data.elemento} />
}
