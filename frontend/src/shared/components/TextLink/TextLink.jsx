import { Link } from 'react-router-dom'
import { cx } from '../../../utils/classNames.js'
import './TextLink.css'

/** Enlace dentro de un texto. Deshabilitado no navega ni recibe el foco, igual que los enlaces de Button. */
export default function TextLink({ to, disabled = false, className, children, ...rest }) {
  const disabledProps = disabled
    ? { 'aria-disabled': true, tabIndex: -1, onClick: (event) => event.preventDefault() }
    : {}

  return (
    <Link {...rest} {...disabledProps} to={to} className={cx('text-link', className)}>
      {children}
    </Link>
  )
}
