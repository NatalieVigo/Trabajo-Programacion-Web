import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useCopyLink } from '../../hooks/useCopyLink.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { listar, revocar } from '../../services/invitaciones.service.js'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  MailIcon,
  PageHeader,
  SearchIcon,
  useConfirm,
  useToast,
} from '../../shared/components'
import { getFullName, pluralize } from '../../utils/format.js'
import InvitationFilters from './InvitationFilters.jsx'
import InvitationsTable from './InvitationsTable.jsx'
import NewInvitationModal from './NewInvitationModal.jsx'
import { contarPorEstado, enlaceDeInvitacion, filtrarInvitaciones, resumirInvitaciones } from './invitationsList.js'
import './InvitationsPage.css'

const SIN_FILTROS = { estado: '', busqueda: '' }
/** Al revocar, estos errores indican que la invitación cambió en otro lado: hay que volver a leer la lista. */
const INVITACION_CAMBIADA = new Set(['INVITATION_NOT_FOUND', 'INVITATION_EXPIRED', 'INVITATION_NOT_PENDING'])

/** Carga, error o lista vacía; con invitaciones muestra `children` (filtros y tabla). */
function InvitationsContent({ status, total, onRetry, onCreate, children }) {
  if (status === 'loading') {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando invitaciones…
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
        No pudimos cargar las invitaciones.
      </Alert>
    )
  }
  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={<MailIcon size={24} />}
          title="Aún no hay invitaciones"
          description="Cada invitación genera un enlace para que un técnico o supervisor active su cuenta."
          action={<Button onClick={onCreate}>Crear la primera invitación</Button>}
        />
      </Card>
    )
  }
  return children
}

/**
 * Invitaciones del supervisor (HU-1 · 1.4, /supervisor/invitaciones): resumen por estado, filtros, lista con
 * «Copiar enlace» y «Revocar» para las pendientes, y «Nueva invitación».
 */
export default function InvitationsPage() {
  const consulta = useAsyncData(listar)
  const confirm = useConfirm()
  const toast = useToast()
  const copiar = useCopyLink()
  const tablaRef = useRef(null)
  const [filtros, setFiltros] = useState(SIN_FILTROS)
  const [creando, setCreando] = useState(false)
  const [revocandoId, setRevocandoId] = useState(null)
  useDocumentTitle('Invitaciones')

  const invitaciones = consulta.data ?? []
  const conteo = contarPorEstado(invitaciones)
  const visibles = filtrarInvitaciones(invitaciones, filtros)
  const limpiarFiltros = () => setFiltros(SIN_FILTROS)

  function agregar(invitacion) {
    consulta.updateData((actuales) => [invitacion, ...actuales])
  }

  async function revocarInvitacion(invitacion) {
    const nombre = getFullName(invitacion)
    const confirmado = await confirm({
      title: '¿Revocar la invitación?',
      message: `${nombre} ya no podrá activar su cuenta con este enlace.`,
      confirmText: 'Revocar invitación',
      variant: 'destructive',
    })
    if (!confirmado) return

    setRevocandoId(invitacion.id)
    try {
      const revocada = await revocar(invitacion.id)
      flushSync(() => {
        setRevocandoId(null)
        consulta.updateData((actuales) => actuales.map((item) => (item.id === revocada.id ? revocada : item)))
      })
      // Sus acciones ya no existen: el foco pasa a la fila, que ahora indica «Revocada».
      tablaRef.current?.querySelector(`[data-invitacion="${revocada.id}"]`)?.focus()
      toast.success(`Revocaste la invitación de ${nombre}.`)
    } catch (error) {
      setRevocandoId(null)
      toast.error(error.message)
      if (INVITACION_CAMBIADA.has(error.code)) consulta.reload()
    }
  }

  return (
    <>
      <PageHeader
        title="Invitaciones"
        subtitle={consulta.status === 'success' ? resumirInvitaciones(conteo) : undefined}
        actions={<Button onClick={() => setCreando(true)}>Nueva invitación</Button>}
      />

      <InvitationsContent
        status={consulta.status}
        total={invitaciones.length}
        onRetry={consulta.reload}
        onCreate={() => setCreando(true)}
      >
        <InvitationFilters filtros={filtros} conteo={conteo} onChange={setFiltros} onClear={limpiarFiltros} />
        {visibles.length > 0 ? (
          <InvitationsTable
            ref={tablaRef}
            invitaciones={visibles}
            revocandoId={revocandoId}
            onCopiar={(invitacion) => copiar(enlaceDeInvitacion(invitacion.token))}
            onRevocar={revocarInvitacion}
          />
        ) : (
          <Card>
            <EmptyState
              icon={<SearchIcon size={24} />}
              title="Ninguna invitación coincide con los filtros"
              description="Prueba con otro estado o busca otro nombre o correo."
              action={
                <Button variant="secondary" onClick={limpiarFiltros}>
                  Ver todas las invitaciones
                </Button>
              }
            />
          </Card>
        )}
        {/* Fuera de la tabla, para anunciar también cuando ningún resultado coincide. */}
        <p className="invitations-page__count" role="status">
          Mostrando {visibles.length} de {pluralize(invitaciones.length, 'invitación', 'invitaciones')}
        </p>
      </InvitationsContent>

      <NewInvitationModal open={creando} onClose={() => setCreando(false)} onCreada={agregar} />
    </>
  )
}
