import { cx } from '../../utils/classNames.js'
import './PlazoDeAtencion.css'

/**
 * Si la atención va dentro o fuera del tiempo esperado de su categoría (p26): «Dentro del tiempo esperado (8 h)». Las
 * esperas no cuentan para ese plazo. `tiempos` es el del servicio de atención.
 */
export default function PlazoDeAtencion({ tiempos, className }) {
  const { dentroDelPlazo, esperadoHoras } = tiempos

  return (
    <div className={cx('plazo', className)}>
      <p className={cx('plazo__resultado', dentroDelPlazo ? 'plazo__resultado--dentro' : 'plazo__resultado--fuera')}>
        {dentroDelPlazo ? 'Dentro' : 'Fuera'} del tiempo esperado ({esperadoHoras} h)
      </p>
    </div>
  )
}
