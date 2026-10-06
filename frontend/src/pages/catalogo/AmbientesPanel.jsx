import { useId, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { eliminarAmbiente } from '../../services/ubicaciones.service.js'
import { Button, Card, EmptyState, SearchIcon, SelectInput, TextInput } from '../../shared/components'
import { pluralize } from '../../utils/format.js'
import AmbientesTable from './AmbientesTable.jsx'
import { OPCIONES_TIPO_AMBIENTE } from './catalogoFormat.js'
import { AMBIENTES_SIN_FILTROS, filtrarAmbientes, hayFiltros, paginar } from './catalogoList.js'
import Paginacion from './Paginacion.jsx'
import { useEliminacion } from './useEliminacion.js'
import './CatalogoFiltros.css'
import './Paginacion.css'

const POR_PAGINA = 10

/** Búsqueda y filtros por sede, pabellón y tipo (p14). El pabellón se elige entre los de la sede filtrada. */
function FiltrosAmbientes({ filtros, sedes, onChange, onLimpiar }) {
  const id = useId()
  const sedesVisibles = filtros.sedeId ? sedes.filter((sede) => sede.id === filtros.sedeId) : sedes
  const pabellones = sedesVisibles.flatMap((sede) => sede.pabellones)

  function cambiarSede(sedeId) {
    const sede = sedes.find((candidata) => candidata.id === sedeId)
    const pabellonDeLaSede = !sede || sede.pabellones.some((pabellon) => pabellon.id === filtros.pabellonId)
    onChange({ ...filtros, sedeId, pabellonId: pabellonDeLaSede ? filtros.pabellonId : '' })
  }

  return (
    <div className="catalogo-filtros">
      <div className="catalogo-filtros__busqueda">
        <label htmlFor={`${id}-busqueda`} className="visually-hidden">
          Buscar por código o nombre
        </label>
        <TextInput
          id={`${id}-busqueda`}
          type="search"
          value={filtros.busqueda}
          onChange={(event) => onChange({ ...filtros, busqueda: event.target.value })}
          placeholder="Buscar por código o nombre"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="catalogo-filtros__select">
        <label htmlFor={`${id}-sede`} className="visually-hidden">
          Sede
        </label>
        <SelectInput
          id={`${id}-sede`}
          value={filtros.sedeId}
          onChange={(event) => cambiarSede(event.target.value)}
          options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
          placeholder="Sede: todas"
        />
      </div>
      <div className="catalogo-filtros__select">
        <label htmlFor={`${id}-pabellon`} className="visually-hidden">
          Pabellón
        </label>
        <SelectInput
          id={`${id}-pabellon`}
          value={filtros.pabellonId}
          onChange={(event) => onChange({ ...filtros, pabellonId: event.target.value })}
          options={pabellones.map((pabellon) => ({ value: pabellon.id, label: `Pabellón ${pabellon.nombre}` }))}
          placeholder="Pabellón: todos"
        />
      </div>
      <div className="catalogo-filtros__select">
        <label htmlFor={`${id}-tipo`} className="visually-hidden">
          Tipo
        </label>
        <SelectInput
          id={`${id}-tipo`}
          value={filtros.tipo}
          onChange={(event) => onChange({ ...filtros, tipo: event.target.value })}
          options={OPCIONES_TIPO_AMBIENTE}
          placeholder="Tipo: todos"
        />
      </div>
      {hayFiltros(filtros) && (
        <Button variant="tertiary" size="sm" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}

/**
 * Pestaña «Ambientes» de Sedes y ambientes (HU-2 · 2.2, p14): filtros, tabla paginada de 10 en 10 y eliminación de
 * los ambientes que no se usan. Crear y editar abren la ventana de la página (`onNuevo`, `onEditar`).
 */
export default function AmbientesPanel({ ambientes, sedes, refrescar, onNuevo, onEditar, onIrASedes }) {
  const { usuario } = useAuth()
  const tablaRef = useRef(null)
  const [filtros, setFiltros] = useState(AMBIENTES_SIN_FILTROS)
  const [pagina, setPagina] = useState(1)
  const { eliminandoId, eliminar } = useEliminacion(refrescar)

  const filtrados = filtrarAmbientes(ambientes, filtros)
  const { pagina: paginaActual, totalPaginas, visibles, desde, hasta } = paginar(filtrados, pagina, POR_PAGINA)
  const hayPabellones = sedes.some((sede) => sede.pabellones.length > 0)

  function cambiarFiltros(siguientes) {
    setFiltros(siguientes)
    setPagina(1)
  }

  async function pedirEliminacion(ambiente) {
    await eliminar({
      id: ambiente.id,
      titulo: '¿Eliminar el ambiente?',
      mensaje: `«${ambiente.codigo} · ${ambiente.nombre}» se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar ambiente',
      eliminarEnServicio: () => eliminarAmbiente(ambiente.id, usuario.id),
      exito: `Ambiente “${ambiente.codigo}” eliminado correctamente.`,
    })
    // Su botón ya no existe: el foco pasa a la tabla en vez de perderse.
    tablaRef.current?.focus()
  }

  if (ambientes.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aún no hay ambientes"
          description={
            hayPabellones
              ? 'Registra el primer ambiente para que la comunidad pueda reportar fallas en él.'
              : 'Primero registra una sede y un pabellón en «Sedes y pabellones».'
          }
          action={
            hayPabellones ? (
              <Button onClick={onNuevo}>Nuevo ambiente</Button>
            ) : (
              <Button onClick={onIrASedes}>Ir a sedes y pabellones</Button>
            )
          }
        />
      </Card>
    )
  }

  return (
    <>
      <FiltrosAmbientes
        filtros={filtros}
        sedes={sedes}
        onChange={cambiarFiltros}
        onLimpiar={() => cambiarFiltros(AMBIENTES_SIN_FILTROS)}
      />
      {visibles.length > 0 ? (
        <AmbientesTable
          ref={tablaRef}
          ambientes={visibles}
          eliminandoId={eliminandoId}
          onEditar={onEditar}
          onEliminar={pedirEliminacion}
        />
      ) : (
        <Card>
          <EmptyState
            icon={<SearchIcon size={24} />}
            title="Ningún ambiente coincide con los filtros"
            description="Prueba con otra sede, pabellón o tipo, o busca otro código."
            action={
              <Button variant="secondary" onClick={() => cambiarFiltros(AMBIENTES_SIN_FILTROS)}>
                Ver todos los ambientes
              </Button>
            }
          />
        </Card>
      )}
      <div className="catalogo-pie">
        {/* Fuera de la tabla, para anunciar también cuando ningún resultado coincide. */}
        <p className="catalogo-pie__conteo" role="status">
          {filtrados.length > 0
            ? `Mostrando ${desde}–${hasta} de ${pluralize(filtrados.length, 'ambiente', 'ambientes')}`
            : `Mostrando 0 de ${pluralize(ambientes.length, 'ambiente', 'ambientes')}`}
        </p>
        <Paginacion
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          onCambiar={setPagina}
          etiqueta="Páginas de ambientes"
        />
      </div>
    </>
  )
}
