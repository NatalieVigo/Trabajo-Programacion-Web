import { useState } from 'react'
import { Button, FormField, Modal } from '../../shared/components'
import { formatPrioridad, pluralize } from '../../utils/format.js'
import TextArea from '../catalogo/TextArea.jsx'

export default function AsignarTecnicoModal({ tickets, tecnicos, onClose, onAsignar }) {
  const [tecnicoId, setTecnicoId] = useState('')
  const [nota, setNota] = useState('')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const categorias = new Set(tickets.map(({ categoriaId }) => categoriaId))
  const habilitados = tecnicos.filter(({ habilitadas }) => [...categorias].every((id) => habilitadas.includes(id)))
  const individual = tickets.length === 1
  const ticket = tickets[0]

  async function enviar(event) {
    event.preventDefault()
    if (!tecnicoId) {
      setErrores({ tecnico: 'Selecciona un técnico habilitado.' })
      return
    }
    setGuardando(true)
    try {
      await onAsignar(tecnicoId, nota)
    } catch (error) {
      setErrores(error.fieldErrors ?? { general: error.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open
      size="md"
      title={individual ? `Asignar ${ticket.codigo}` : `Asignar ${pluralize(tickets.length, 'ticket', 'tickets')}`}
      description={individual ? `${ticket.categoria} · ${ticket.ambiente} · prioridad ${formatPrioridad(ticket.prioridad).toLowerCase()}` : `${tickets.length} tickets seleccionados · técnicos habilitados para todas sus categorías`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="asignar-ticket" loading={guardando} loadingText="Asignando…" disabled={!habilitados.length}>Asignar</Button>
        </>
      }
    >
      <form id="asignar-ticket" className="cola-modal" onSubmit={enviar}>
        <fieldset className="cola-modal__fieldset" aria-describedby={errores.tecnico ? 'asignar-tecnico-error' : undefined}>
          <legend className="field__label">Técnico habilitado</legend>
          {habilitados.length ? habilitados.map((tecnico) => (
            <label key={tecnico.id} className={`cola-modal__tecnico ${tecnicoId === tecnico.id ? 'is-selected' : ''}`}>
              <input
                className="visually-hidden"
                type="radio"
                name="tecnico"
                value={tecnico.id}
                checked={tecnicoId === tecnico.id}
                onChange={() => { setTecnicoId(tecnico.id); setErrores({}) }}
              />
              <span>{tecnico.nombre}</span>
              <span className="cola-modal__carga">{pluralize(tecnico.carga, 'ticket', 'tickets')} · {pluralize(tecnico.criticos, 'crítico', 'críticos')}</span>
            </label>
          )) : <p className="cola-modal__sin-tecnicos">No hay técnicos activos habilitados para todas las categorías seleccionadas.</p>}
          {errores.tecnico && <p id="asignar-tecnico-error" className="field__message field__message--error">{errores.tecnico}</p>}
        </fieldset>
        <FormField label="Nota para el técnico" error={errores.nota}>
          <TextArea value={nota} onChange={(event) => setNota(event.target.value)} maxLength={240} rows={3} />
        </FormField>
        {errores.general && <p role="alert" className="field__message field__message--error">{errores.general}</p>}
      </form>
    </Modal>
  )
}
