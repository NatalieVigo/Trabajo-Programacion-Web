import { Link } from 'react-router-dom'
import { cx } from '../../../utils/classNames.js'
import './Button.css'

/**
 * Botón del sistema de diseño: primary, secondary, tertiary, destructive y tertiary-destructive (acción destructiva
 * dentro de una fila, p33). Con `to` se renderiza como Link de React Router y con `href` como enlace
 * nativo (anclas de la misma página, mailto:). Mientras `loading` está activo queda deshabilitado y
 * muestra `loadingText`.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  loadingText,
  to,
  href,
  type = 'button',
  disabled = false,
  className,
  children,
  onClick,
  ...rest
}) {
  const classes = cx(
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    block && 'btn--block',
    loading && 'is-loading',
    className,
  )
  const content = loading && loadingText ? loadingText : children
  const isDisabled = disabled || loading

  if (to !== undefined || href !== undefined) {
    const linkProps = isDisabled
      ? { 'aria-disabled': true, tabIndex: -1, onClick: (event) => event.preventDefault() }
      : { onClick }
    return to !== undefined ? (
      <Link {...rest} {...linkProps} to={to} className={classes}>
        {content}
      </Link>
    ) : (
      <a {...rest} {...linkProps} href={href} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {content}
    </button>
  )
}
