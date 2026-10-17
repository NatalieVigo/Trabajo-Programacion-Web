import { Link } from 'react-router-dom'
import { cx } from '../../../utils/classNames.js'
import './TextLink.css'

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
