import { cx } from '../../../utils/classNames.js'
import { passwordStrength } from '../../../utils/password.js'
import './PasswordStrength.css'

const BARS = [1, 2, 3]

// el aria-live siempre está para que se anuncie cada cambio de nivel
export default function PasswordStrength({ password, className }) {
  const { score, label } = passwordStrength(password)

  return (
    <>
      {score > 0 && (
        <div className={cx('password-strength', `password-strength--${score}`, className)} aria-hidden="true">
          <div className="password-strength__bars">
            {BARS.map((bar) => (
              <span key={bar} className={cx('password-strength__bar', bar <= score && 'is-filled')} />
            ))}
          </div>
          <span className="password-strength__label">{label}</span>
        </div>
      )}
      <p className="visually-hidden" aria-live="polite">
        {label && `Seguridad de la contraseña: ${label}`}
      </p>
    </>
  )
}
