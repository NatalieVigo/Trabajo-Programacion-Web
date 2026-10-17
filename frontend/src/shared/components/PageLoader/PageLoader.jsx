import './PageLoader.css'

export default function PageLoader({ message = 'Cargando…' }) {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__spinner" aria-hidden="true" />
      <p className="page-loader__message">{message}</p>
    </div>
  )
}
