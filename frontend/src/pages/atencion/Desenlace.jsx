import { useId } from 'react'
import { Card } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDateTime, getDisplayName } from '../../utils/format.js'
import PlazoDeAtencion from './PlazoDeAtencion.jsx'

/**
 * Desenlace de un ticket cerrado (HU-5 · 5.4): la solución aplicada, quién lo cerró y cuándo, y el tiempo total de
 * atención frente al tiempo esperado.
 */
export default function Desenlace({ desenlace, tiempos }) {
  const tituloId = useId()

  return (
    <Card as="section" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="desenlace__titulo">
        Desenlace
      </h2>
      <dl className="desenlace">
        <div className="desenlace__dato desenlace__dato--ancho">
          <dt className="text-label text-muted">Solución aplicada</dt>
          <dd className="desenlace__solucion">{desenlace.solucion}</dd>
        </div>
        <div className="desenlace__dato">
          <dt className="text-label text-muted">Cerrado</dt>
          <dd>
            <time dateTime={desenlace.cerradoEn}>{formatDateTime(desenlace.cerradoEn)}</time> ·{' '}
            {getDisplayName(desenlace.cerradoPor)}
          </dd>
        </div>
        <div className="desenlace__dato">
          <dt className="text-label text-muted">Tiempo total de atención</dt>
          <dd className="desenlace__tiempo">{formatDuracion(tiempos.totalMs)}</dd>
          <dd>
            <PlazoDeAtencion tiempos={tiempos} />
          </dd>
        </div>
      </dl>
    </Card>
  )
}
