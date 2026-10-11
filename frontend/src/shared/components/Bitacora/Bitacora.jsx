import { cx } from '../../../utils/classNames.js'
import { formatDateTime, formatRol, getDisplayName } from '../../../utils/format.js'
import Avatar from '../Avatar/Avatar.jsx'
import './Bitacora.css'

const TIPOS = {
  publico: 'Comentario público',
  interno: 'Nota interna · no visible para el usuario',
}

/**
 * Bitácora de un ticket (p20, p25): sus entradas en orden, cada una con el autor, su rol y el momento. `entradas` es
 * [{ id, tipo, mensaje, creadoEn, autor: { nombres, apellidos, rol } }]. Con `mostrarTipo` cada entrada indica si es
 * un comentario público o una nota interna y las internas se resaltan; la vista del usuario no lo necesita porque
 * solo recibe comentarios públicos.
 */
export default function Bitacora({ entradas, mostrarTipo = false, className, ...rest }) {
  return (
    <ol {...rest} className={cx('bitacora', className)}>
      {entradas.map(({ id, tipo, mensaje, creadoEn, autor }) => (
        <li key={id} className={cx('bitacora__entrada', mostrarTipo && tipo === 'interno' && 'bitacora__entrada--interna')}>
          <div className="bitacora__cabecera">
            <Avatar
              nombres={autor.nombres}
              apellidos={autor.apellidos}
              size="sm"
              tone={autor.rol === 'usuario' ? 'accent' : 'primary'}
            />
            <p className="bitacora__autor">
              <span className="bitacora__nombre">{getDisplayName(autor)}</span>{' '}
              <span className="bitacora__meta">
                {formatRol(autor.rol)} · <time dateTime={creadoEn}>{formatDateTime(creadoEn)}</time>
              </span>
            </p>
            {mostrarTipo && <p className="bitacora__tipo">{TIPOS[tipo]}</p>}
          </div>
          <p className="bitacora__mensaje">{mensaje}</p>
        </li>
      ))}
    </ol>
  )
}
