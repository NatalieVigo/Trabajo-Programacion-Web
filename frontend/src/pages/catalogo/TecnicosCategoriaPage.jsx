import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { guardarMatriz, obtenerMatriz } from '../../services/habilitaciones.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, useConfirm, useToast } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import { alternarHabilitacion, avisosDeCobertura, habilitadasDe, tecnicosCambiados } from './matrizTecnicos.js'
import MatrizTecnicosTable from './MatrizTecnicosTable.jsx'
import './TecnicosCategoriaPage.css'

const TITULO = 'Técnicos por categoría'
const SUBTITULO = 'Marca las categorías que cada técnico puede atender, según su especialidad.'

const invitarTecnico = (
  <Button to={ROUTES.supervisorInvitaciones} variant="secondary">
    Invitar técnico
  </Button>
)

/**
 * Edita la matriz cargada: las casillas cambian una copia local y «Guardar matriz» envía solo los técnicos que
 * cambiaron. Los avisos de cobertura se recalculan mientras se marca.
 */
function EditorDeMatriz({ matrizInicial }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [matriz, setMatriz] = useState(matrizInicial)
  const [habilitadas, setHabilitadas] = useState(() => habilitadasDe(matrizInicial.tecnicos))
  const [guardando, setGuardando] = useState(false)

  const guardadas = habilitadasDe(matriz.tecnicos)
  const cambiados = tecnicosCambiados(guardadas, habilitadas)
  const avisos = avisosDeCobertura(matriz.categorias, habilitadas)

  async function guardar() {
    setGuardando(true)
    try {
      const cambios = Object.fromEntries(cambiados.map((tecnicoId) => [tecnicoId, habilitadas[tecnicoId]]))
      const actualizada = await guardarMatriz(cambios, usuario.id)
      setMatriz(actualizada)
      setHabilitadas(habilitadasDe(actualizada.tecnicos))
      toast.success(`Se guardaron las habilitaciones de ${pluralize(cambiados.length, 'técnico', 'técnicos')}.`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  async function descartar() {
    const confirmado = await confirm({
      title: '¿Descartar los cambios?',
      message: 'Las casillas volverán a como estaban guardadas.',
      confirmText: 'Descartar',
      cancelText: 'Seguir editando',
      variant: 'destructive',
    })
    if (confirmado) setHabilitadas(guardadas)
  }

  return (
    <>
      <PageHeader
        title={TITULO}
        subtitle={SUBTITULO}
        actions={
          <>
            {invitarTecnico}
            <Button onClick={guardar} disabled={cambiados.length === 0} loading={guardando} loadingText="Guardando…">
              Guardar matriz
            </Button>
          </>
        }
      />

      {matriz.tecnicos.length === 0 ? (
        <Card>
          <EmptyState
            title="Aún no hay técnicos activos"
            description="Invita a un técnico: al activar su cuenta declara su especialidad y aparece en esta matriz."
            action={invitarTecnico}
          />
        </Card>
      ) : (
        <>
          <div className="tecnicos-page__pendientes" role="status">
            {cambiados.length > 0 && (
              <>
                <span>Cambios sin guardar en {pluralize(cambiados.length, 'técnico', 'técnicos')}.</span>
                <Button variant="tertiary" size="sm" onClick={descartar} disabled={guardando}>
                  Descartar cambios
                </Button>
              </>
            )}
          </div>
          <MatrizTecnicosTable
            categorias={matriz.categorias}
            tecnicos={matriz.tecnicos}
            habilitadas={habilitadas}
            deshabilitada={guardando}
            onAlternar={(tecnicoId, categoriaId) =>
              setHabilitadas((actuales) => alternarHabilitacion(actuales, tecnicoId, categoriaId, matriz.categorias))
            }
          />
          <div className="tecnicos-page__notas">
            <div className="tecnicos-page__avisos">
              {avisos.map(({ categoriaId, variante, mensaje }) => (
                <Alert key={categoriaId} variant={variante}>
                  {mensaje}
                </Alert>
              ))}
            </div>
            <Card className="tecnicos-page__nota">
              <p>Carga actual = tickets asignados en curso: abiertos, en atención, en espera o reabiertos.</p>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

/** Técnicos por categoría (HU-2 · 2.3, mockup p16): carga la matriz y la entrega al editor. */
export default function TecnicosCategoriaPage() {
  const { status, data, reload } = useAsyncData(obtenerMatriz)
  useDocumentTitle(TITULO)

  if (status === 'success') return <EditorDeMatriz matrizInicial={data} />

  return (
    <>
      <PageHeader title={TITULO} subtitle={SUBTITULO} />
      {status === 'loading' ? (
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando la matriz de técnicos…
          </p>
        </Card>
      ) : (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar la matriz de técnicos.
        </Alert>
      )}
    </>
  )
}
