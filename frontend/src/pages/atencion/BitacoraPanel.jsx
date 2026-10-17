import { useId, useState } from 'react'
import { Bitacora, Card, EmptyState, SelectInput } from '../../shared/components'
import { getDisplayName, pluralize } from '../../utils/format.js'
import NuevaEntradaForm from './NuevaEntradaForm.jsx'

const FILTROS = [
  { value: 'todas', label: 'Mostrar: todas' },
  { value: 'publico', label: 'Mostrar: comentarios públicos' },
  { value: 'interno', label: 'Mostrar: notas internas' },
]

const SIN_RESULTADOS = {
  todas: 'Aún no hay entradas en la bitácora',
  publico: 'Este ticket no tiene comentarios públicos',
  interno: 'Este ticket no tiene notas internas',
}

function motivoDeSoloLectura(ticket) {
  if (ticket.estado === 'cerrado') return 'El ticket está cerrado: su bitácora ya no admite entradas.'
  if (!ticket.tecnico) return 'Este ticket aún no tiene un técnico asignado: quien lo reciba registrará aquí su avance.'
  return `Este ticket lo atiende ${getDisplayName(ticket.tecnico)}. Puedes consultarlo, pero solo quien lo atiende registra el avance.`
}

// Bitácora del ticket (HU-5). Si no puedes escribir, se muestra el motivo.
export default function BitacoraPanel({ atencion, onActualizada, onDesactualizada }) {
  const { ticket, bitacora, permisos } = atencion
  const tituloId = useId()
  const filtroId = useId()
  const [filtro, setFiltro] = useState('todas')
  const visibles = filtro === 'todas' ? bitacora : bitacora.filter((entrada) => entrada.tipo === filtro)

  return (
    <Card as="section" className="bitacora-panel" aria-labelledby={tituloId}>
      <div className="bitacora-panel__cabecera">
        <h2 id={tituloId} className="bitacora-panel__titulo">
          Bitácora · {pluralize(bitacora.length, 'entrada', 'entradas')}
        </h2>
        {permisos.verInternas && (
          <div className="bitacora-panel__filtro">
            <label htmlFor={filtroId} className="visually-hidden">
              Entradas que se muestran
            </label>
            <SelectInput id={filtroId} value={filtro} onChange={(event) => setFiltro(event.target.value)} options={FILTROS} />
          </div>
        )}
      </div>

      {visibles.length > 0 ? (
        <Bitacora entradas={visibles} mostrarTipo={permisos.verInternas} aria-label="Entradas de la bitácora" />
      ) : (
        <EmptyState compact titleAs="h3" title={SIN_RESULTADOS[filtro]} />
      )}

      {permisos.comentar ? (
        <NuevaEntradaForm
          ticket={ticket}
          permisos={permisos}
          onGuardada={onActualizada}
          onDesactualizada={onDesactualizada}
        />
      ) : (
        <p className="bitacora-panel__lectura">{motivoDeSoloLectura(ticket)}</p>
      )}
    </Card>
  )
}
