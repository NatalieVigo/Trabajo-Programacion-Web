import { useState } from 'react'
import { Alert, Button, FormField, Modal, PriorityBadge } from '../../shared/components'
import { HORAS_POR_PRIORIDAD } from '../../services/cola.service.js'
import { formatPrioridad } from '../../utils/format.js'
import TextArea from '../catalogo/TextArea.jsx'
import { PRIORIDADES } from './colaList.js'

export default function CambiarPrioridadModal({ tickets, onClose, onGuardar }) {
  const [prioridad, setPrioridad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const actuales = [...new Set(tickets.map(({ prioridad: valor }) => valor))]
  const actual = actuales.length === 1 ? actuales[0] : null
  const horasActuales = [...new Set(tickets.map(({ esperadoHoras }) => esperadoHoras))]

  async function enviar(event) {
    event.preventDefault()
    const siguientes = {}
    if (!prioridad || (actual && prioridad === actual)) siguientes.prioridad = 'Selecciona una prioridad diferente.'
    if (motivo.trim().length < 10 || motivo.trim().length > 240) siguientes.motivo = 'Explica el motivo con entre 10 y 240 caracteres.'
    if (Object.keys(siguientes).length) { setErrores(siguientes); return }
    setGuardando(true)
    try {
      await onGuardar(prioridad, motivo)
    } catch (error) {
      setErrores(error.fieldErrors ?? { general: error.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open
      title="Cambiar prioridad"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" form="cambiar-prioridad" loading={guardando} loadingText="Guardando…">Guardar prioridad</Button>
        </>
      }
    >
      <form id="cambiar-prioridad" className="cola-modal" onSubmit={enviar}>
        <div className="cola-modal__comparacion">
          <div><span className="field__label">Actual</span><div>{actual ? <PriorityBadge prioridad={actual} /> : <span>Varias</span>}</div></div>
          <span aria-hidden="true" className="cola-modal__flecha">→</span>
          <div><span className="field__label">Nueva</span><div>{prioridad ? <PriorityBadge prioridad={prioridad} /> : <span>Selecciona una</span>}</div></div>
        </div>
        <fieldset className="cola-modal__fieldset">
          <legend className="field__label">Nueva prioridad</legend>
          <div className="cola-modal__prioridades">
            {PRIORIDADES.map((valor) => (
              <label key={valor} className={`cola-modal__prioridad ${prioridad === valor ? 'is-selected' : ''}`}>
                <input type="radio" name="prioridad" value={valor} checked={prioridad === valor} onChange={() => { setPrioridad(valor); setErrores({}) }} />
                <PriorityBadge prioridad={valor} />
              </label>
            ))}
          </div>
          {errores.prioridad && <p className="field__message field__message--error">{errores.prioridad}</p>}
        </fieldset>
        <FormField label="Motivo (obligatorio)" required error={errores.motivo}>
          <TextArea value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={240} rows={3} />
        </FormField>
        {prioridad && (
          <Alert variant="warning">
            {tickets.length === 1 ? 'El ticket' : 'Los tickets'} se {tickets.length === 1 ? 'ordenará' : 'ordenarán'} según la nueva prioridad. El tiempo esperado {horasActuales.length === 1 ? `pasará de ${horasActuales[0]} h` : 'se recalculará'} a {HORAS_POR_PRIORIDAD[prioridad]} h ({formatPrioridad(prioridad).toLowerCase()}).
          </Alert>
        )}
        {errores.general && <p role="alert" className="field__message field__message--error">{errores.general}</p>}
      </form>
    </Modal>
  )
}
