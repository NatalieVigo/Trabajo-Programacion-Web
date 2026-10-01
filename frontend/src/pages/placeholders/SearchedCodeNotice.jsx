import { useSearchParams } from 'react-router-dom'
import { Alert } from '../../shared/components'

/** Código que llegó desde el buscador de la cabecera (?codigo=), mientras la lista de tickets no exista. */
export default function SearchedCodeNotice({ className }) {
  const [searchParams] = useSearchParams()
  const codigo = searchParams.get('codigo')?.trim()
  if (!codigo) return null

  return (
    <Alert variant="info" className={className}>
      Buscaste el código <code>{codigo}</code>. El resultado aparecerá aquí cuando esta sección esté disponible.
    </Alert>
  )
}
