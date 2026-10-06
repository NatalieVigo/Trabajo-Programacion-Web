import { useId } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { eliminarPabellon, eliminarSede } from '../../services/ubicaciones.service.js'
import { Button, Card, EmptyState } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import { useEliminacion } from './useEliminacion.js'

function SedeCard({ sede, eliminandoId, onEditarSede, onEliminarSede, onNuevoPabellon, onEditarPabellon, onEliminarPabellon }) {
  const tituloId = useId()

  return (
    <Card as="section" className="sede-card" aria-labelledby={tituloId}>
      <div className="sede-card__header">
        <div>
          <h2 id={tituloId} className="sede-card__title">
            {sede.nombre}
          </h2>
          <p className="sede-card__meta">
            {pluralize(sede.pabellones.length, 'pabellón', 'pabellones')} ·{' '}
            {pluralize(sede.ambientes, 'ambiente', 'ambientes')}
          </p>
        </div>
        <div className="sede-card__actions">
          <Button variant="secondary" size="sm" onClick={() => onNuevoPabellon(sede.id)}>
            Nuevo pabellón <span className="visually-hidden">en {sede.nombre}</span>
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => onEditarSede(sede)}>
            Editar <span className="visually-hidden">{sede.nombre}</span>
          </Button>
          {sede.eliminable && (
            <Button
              variant="tertiary-destructive"
              size="sm"
              onClick={() => onEliminarSede(sede)}
              loading={eliminandoId === sede.id}
              loadingText="Eliminando…"
            >
              Eliminar <span className="visually-hidden">{sede.nombre}</span>
            </Button>
          )}
        </div>
      </div>

      {sede.pabellones.length > 0 ? (
        <ul className="sede-card__pabellones" aria-label={`Pabellones de ${sede.nombre}`}>
          {sede.pabellones.map((pabellon) => (
            <li key={pabellon.id} className="sede-card__pabellon">
              <span className="sede-card__pabellon-nombre">Pabellón {pabellon.nombre}</span>
              <span className="sede-card__pabellon-meta">{pluralize(pabellon.ambientes, 'ambiente', 'ambientes')}</span>
              <span className="sede-card__pabellon-actions">
                <Button variant="tertiary" size="sm" onClick={() => onEditarPabellon(pabellon)}>
                  Editar <span className="visually-hidden">pabellón {pabellon.nombre}</span>
                </Button>
                {pabellon.eliminable && (
                  <Button
                    variant="tertiary-destructive"
                    size="sm"
                    onClick={() => onEliminarPabellon(pabellon)}
                    loading={eliminandoId === pabellon.id}
                    loadingText="Eliminando…"
                  >
                    Eliminar <span className="visually-hidden">pabellón {pabellon.nombre}</span>
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sede-card__vacio">Aún no tiene pabellones.</p>
      )}
    </Card>
  )
}

/**
 * Pestaña «Sedes y pabellones» de Sedes y ambientes (HU-2 · 2.2): cada sede con sus pabellones y cuántos ambientes
 * tiene cada uno. Solo se eliminan las sedes sin pabellones y los pabellones sin ambientes. Crear y editar abren las
 * ventanas de la página.
 */
export default function SedesPanel({ sedes, refrescar, onNuevaSede, onEditarSede, onNuevoPabellon, onEditarPabellon }) {
  const { usuario } = useAuth()
  const { eliminandoId, eliminar } = useEliminacion(refrescar)

  if (sedes.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aún no hay sedes"
          description="Registra la primera sede para agregar sus pabellones y ambientes."
          action={<Button onClick={onNuevaSede}>Nueva sede</Button>}
        />
      </Card>
    )
  }

  function pedirEliminacionDeSede(sede) {
    return eliminar({
      id: sede.id,
      titulo: '¿Eliminar la sede?',
      mensaje: `«${sede.nombre}» se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar sede',
      eliminarEnServicio: () => eliminarSede(sede.id, usuario.id),
      exito: `Sede “${sede.nombre}” eliminada correctamente.`,
    })
  }

  function pedirEliminacionDePabellon(pabellon) {
    return eliminar({
      id: pabellon.id,
      titulo: '¿Eliminar el pabellón?',
      mensaje: `El pabellón «${pabellon.nombre}» se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar pabellón',
      eliminarEnServicio: () => eliminarPabellon(pabellon.id, usuario.id),
      exito: `Pabellón “${pabellon.nombre}” eliminado correctamente.`,
    })
  }

  return (
    <div className="sedes-panel">
      {sedes.map((sede) => (
        <SedeCard
          key={sede.id}
          sede={sede}
          eliminandoId={eliminandoId}
          onEditarSede={onEditarSede}
          onEliminarSede={pedirEliminacionDeSede}
          onNuevoPabellon={onNuevoPabellon}
          onEditarPabellon={onEditarPabellon}
          onEliminarPabellon={pedirEliminacionDePabellon}
        />
      ))}
    </div>
  )
}
