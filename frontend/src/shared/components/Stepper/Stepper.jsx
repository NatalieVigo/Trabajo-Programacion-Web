import { cx } from '../../../utils/classNames.js'
import { CheckIcon } from '../icons.jsx'
import './Stepper.css'

function estadoDelPaso(numero, actual) {
  if (numero < actual) return 'done'
  return numero === actual ? 'current' : 'upcoming'
}

// current empieza en 1
export default function Stepper({ steps, current, label = 'Pasos', className }) {
  return (
    <ol className={cx('stepper', className)} aria-label={label}>
      {steps.map((step, index) => {
        const numero = index + 1
        const estado = estadoDelPaso(numero, current)
        return (
          <li
            key={step}
            className={cx('stepper__step', `stepper__step--${estado}`)}
            aria-current={estado === 'current' ? 'step' : undefined}
          >
            <span className="stepper__marker" aria-hidden="true">
              {estado === 'done' ? <CheckIcon size={12} /> : numero}
            </span>
            <span className="stepper__label">
              {step}
              {estado === 'done' && <span className="visually-hidden"> (completado)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
