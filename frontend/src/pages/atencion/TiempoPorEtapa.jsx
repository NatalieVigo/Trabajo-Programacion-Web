import { useId } from 'react'
import { Card } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatEstado } from '../../utils/format.js'

/**
 * Tiempo por etapa (HU-5 · 5.5, p27): cuánto pasó el ticket en cada estado, con una barra proporcional a la etapa más
 * larga. `etapas` es [{ estado, ms }] y `tiempos`, el total y la espera, para indicar qué parte del tiempo fue espera.
 */
export default function TiempoPorEtapa({ etapas, tiempos }) {
  const tituloId = useId()
  const mayor = Math.max(...etapas.map(({ ms }) => ms), 1)
  const porcentajeEnEspera = tiempos.totalMs > 0 ? Math.round((tiempos.enEsperaMs / tiempos.totalMs) * 100) : 0

  return (
    <Card as="section" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="tiempo-etapas__titulo">
        Tiempo por etapa
      </h2>
      <ul className="tiempo-etapas">
        {etapas.map(({ estado, ms }) => (
          <li key={estado} className={`tiempo-etapa tiempo-etapa--${estado}`}>
            <span className="tiempo-etapa__nombre">{formatEstado(estado)}</span>{' '}
            <span className="tiempo-etapa__duracion">{formatDuracion(ms)}</span>
            <span className="tiempo-etapa__barra" aria-hidden="true">
              <span className="tiempo-etapa__valor" style={{ width: `${(ms / mayor) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {tiempos.enEsperaMs > 0 && (
        <p className="tiempo-etapas__nota">
          El {porcentajeEnEspera} % del tiempo se consumió en espera. El tiempo en espera no cuenta para el tiempo esperado
          de atención.
        </p>
      )}
    </Card>
  )
}
