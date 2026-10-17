import { cx } from '../../utils/classNames.js'
import './PlazoDeAtencion.css'

// las esperas no cuentan para el plazo
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
