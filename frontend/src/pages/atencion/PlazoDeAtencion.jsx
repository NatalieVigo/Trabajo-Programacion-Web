import { cx } from '../../utils/classNames.js'
import { formatDuracion } from '../../utils/duracion.js'
import './PlazoDeAtencion.css'

/**
 * Si la atención va dentro o fuera del tiempo esperado de su categoría. Las esperas no cuentan para ese plazo: cuando
 * las hubo, aclara cuánto fue de atención efectiva. `tiempos` es el del servicio de atención.
 */
export default function PlazoDeAtencion({ tiempos, className }) {
  const { dentroDelPlazo, esperadoHoras, enEsperaMs, atencionMs } = tiempos

  return (
    <div className={cx('plazo', className)}>
      <p className={cx('plazo__resultado', dentroDelPlazo ? 'plazo__resultado--dentro' : 'plazo__resultado--fuera')}>
        {dentroDelPlazo ? 'Dentro' : 'Fuera'} del tiempo esperado ({esperadoHoras} h)
      </p>
      {enEsperaMs > 0 && (
        <p className="plazo__detalle">
          Sin contar {formatDuracion(enEsperaMs)} en espera: {formatDuracion(atencionMs)} de atención.
        </p>
      )}
    </div>
  )
}
