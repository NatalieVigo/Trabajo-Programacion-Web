import { useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { listarAmbientes, listarSedes } from '../../services/ubicaciones.service.js'
import { Alert, Button, Card, PageHeader } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import AmbienteModal from './AmbienteModal.jsx'
import AmbientesPanel from './AmbientesPanel.jsx'
import PabellonModal from './PabellonModal.jsx'
import SedeModal from './SedeModal.jsx'
import SedesPanel from './SedesPanel.jsx'
import { useConsultaRefrescable } from './useConsultaRefrescable.js'
import './UbicacionesPage.css'

const cargarUbicaciones = () =>
  Promise.all([listarAmbientes(), listarSedes()]).then(([ambientes, sedes]) => ({ ambientes, sedes }))

const PESTANAS = [
  { id: 'ambientes', etiqueta: 'Ambientes' },
  { id: 'sedes', etiqueta: 'Sedes y pabellones' },
]

const TECLAS_DE_PESTANA = { ArrowRight: 1, ArrowLeft: -1 }

/** «11 ambientes registrados en 1 sede y 9 pabellones.» */
function resumirUbicaciones({ ambientes, sedes }) {
  const pabellones = sedes.reduce((total, sede) => total + sede.pabellones.length, 0)
  return (
    `${pluralize(ambientes.length, 'ambiente registrado', 'ambientes registrados')} en ` +
    `${pluralize(sedes.length, 'sede', 'sedes')} y ${pluralize(pabellones, 'pabellón', 'pabellones')}.`
  )
}

/**
 * Sedes y ambientes (HU-2 · 2.2, mockups p14 y p15) en dos pestañas: los ambientes del campus y el registro de sedes y
 * pabellones. La pestaña elegida queda en la dirección (?vista=sedes). Las altas y ediciones se hacen en ventanas.
 */
export default function UbicacionesPage() {
  const consulta = useConsultaRefrescable(cargarUbicaciones)
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal, setModal] = useState(null)
  const idBase = useId()
  const pestanasRef = useRef([])
  useDocumentTitle('Sedes y ambientes')

  const vista = searchParams.get('vista') === 'sedes' ? 'sedes' : 'ambientes'
  const datos = consulta.status === 'success' ? consulta.data : null
  const hayPabellones = datos?.sedes.some((sede) => sede.pabellones.length > 0) ?? false

  function irA(pestana) {
    setSearchParams(pestana === 'ambientes' ? {} : { vista: pestana }, { replace: true })
  }

  /** Las flechas mueven entre pestañas, como en un grupo de pestañas nativo. */
  function moverConFlechas(event) {
    const paso = TECLAS_DE_PESTANA[event.key]
    if (!paso) return
    event.preventDefault()
    const indice = (PESTANAS.findIndex(({ id }) => id === vista) + paso + PESTANAS.length) % PESTANAS.length
    irA(PESTANAS[indice].id)
    pestanasRef.current[indice]?.focus()
  }

  async function alGuardar() {
    setModal(null)
    await consulta.refrescar()
  }

  const cerrarModal = () => setModal(null)
  const accionPrincipal =
    vista === 'ambientes' ? (
      <Button onClick={() => setModal({ tipo: 'ambiente' })} disabled={!hayPabellones}>
        Nuevo ambiente
      </Button>
    ) : (
      <Button onClick={() => setModal({ tipo: 'sede' })}>Nueva sede</Button>
    )

  return (
    <>
      <PageHeader
        title="Sedes y ambientes"
        subtitle={datos ? resumirUbicaciones(datos) : undefined}
        actions={datos ? accionPrincipal : undefined}
      />

      {consulta.status === 'loading' && (
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando las sedes y ambientes…
          </p>
        </Card>
      )}
      {consulta.status === 'error' && (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={consulta.reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar las sedes y ambientes.
        </Alert>
      )}

      {datos && (
        <>
          <div
            role="tablist"
            aria-label="Secciones de sedes y ambientes"
            className="ubicaciones-tabs"
            onKeyDown={moverConFlechas}
          >
            {PESTANAS.map(({ id, etiqueta }, indice) => (
              <button
                key={id}
                ref={(elemento) => {
                  pestanasRef.current[indice] = elemento
                }}
                type="button"
                role="tab"
                id={`${idBase}-tab-${id}`}
                aria-selected={vista === id}
                aria-controls={`${idBase}-panel-${id}`}
                tabIndex={vista === id ? 0 : -1}
                className="ubicaciones-tabs__tab"
                onClick={() => irA(id)}
              >
                {etiqueta}{' '}
                <span className="ubicaciones-tabs__count">
                  {id === 'ambientes' ? datos.ambientes.length : datos.sedes.length}
                </span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`${idBase}-panel-ambientes`}
            aria-labelledby={`${idBase}-tab-ambientes`}
            hidden={vista !== 'ambientes'}
          >
            <AmbientesPanel
              ambientes={datos.ambientes}
              sedes={datos.sedes}
              refrescar={consulta.refrescar}
              onNuevo={() => setModal({ tipo: 'ambiente' })}
              onEditar={(ambiente) => setModal({ tipo: 'ambiente', registro: ambiente })}
              onIrASedes={() => irA('sedes')}
            />
          </div>
          <div
            role="tabpanel"
            id={`${idBase}-panel-sedes`}
            aria-labelledby={`${idBase}-tab-sedes`}
            hidden={vista !== 'sedes'}
          >
            <SedesPanel
              sedes={datos.sedes}
              refrescar={consulta.refrescar}
              onNuevaSede={() => setModal({ tipo: 'sede' })}
              onEditarSede={(sede) => setModal({ tipo: 'sede', registro: sede })}
              onNuevoPabellon={(sedeId) => setModal({ tipo: 'pabellon', sedeId })}
              onEditarPabellon={(pabellon) => setModal({ tipo: 'pabellon', registro: pabellon })}
            />
          </div>
        </>
      )}

      {datos && modal?.tipo === 'ambiente' && (
        <AmbienteModal ambiente={modal.registro} sedes={datos.sedes} onClose={cerrarModal} onGuardado={alGuardar} />
      )}
      {datos && modal?.tipo === 'sede' && <SedeModal sede={modal.registro} onClose={cerrarModal} onGuardado={alGuardar} />}
      {datos && modal?.tipo === 'pabellon' && (
        <PabellonModal
          pabellon={modal.registro}
          sedeId={modal.sedeId}
          sedes={datos.sedes}
          onClose={cerrarModal}
          onGuardado={alGuardar}
        />
      )}
    </>
  )
}
