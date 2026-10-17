import { useRef, useState } from 'react'
import { Button, TextInput } from '../../../shared/components'
import { validarRangoMetricas } from '../../../services/metricas.service.js'
import { formatDate } from '../../../utils/format.js'

export default function PeriodoFiltro({ rango, onChange, etiqueta = 'Periodo' }) {
  const ref = useRef(null)
  const [desde, setDesde] = useState(rango.desde)
  const [hasta, setHasta] = useState(rango.hasta)
  const [error, setError] = useState('')
  function aplicar(event) {
    event.preventDefault()
    try {
      validarRangoMetricas({ desde, hasta })
      setError('')
      onChange({ desde, hasta })
      ref.current.open = false
    } catch (e) { setError(e.fieldErrors?.periodo ?? e.message) }
  }
  return <details ref={ref} className="hu7-periodo">
    <summary>{etiqueta}: {formatDate(`${rango.desde}T12:00:00-05:00`)} - {formatDate(`${rango.hasta}T12:00:00-05:00`)} <span aria-hidden="true">▾</span></summary>
    <form className="hu7-periodo__panel" onSubmit={aplicar}>
      <label>Desde<TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required /></label>
      <label>Hasta<TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required /></label>
      {error && <p role="alert" className="field__message--error">{error}</p>}
      <Button type="submit" size="sm">Aplicar periodo</Button>
    </form>
  </details>
}
