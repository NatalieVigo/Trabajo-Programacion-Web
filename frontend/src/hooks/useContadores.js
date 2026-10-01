import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { obtenerContadores } from '../services/resumen.service.js'

/**
 * Contadores del usuario para la cabecera y el menú lateral, o null mientras llegan. Se vuelven a pedir en cada
 * navegación para reflejar lo que cambie en otras vistas, sin ocultar los valores anteriores mientras tanto. Si la
 * consulta falla se conservan los últimos valores: los contadores son informativos y no bloquean la navegación.
 */
export function useContadores(usuario) {
  const { pathname } = useLocation()
  const [contadores, setContadores] = useState(null)

  useEffect(() => {
    let activo = true
    obtenerContadores(usuario).then(
      (resultado) => {
        if (activo) setContadores(resultado)
      },
      () => {},
    )
    return () => {
      activo = false
    }
  }, [usuario, pathname])

  return contadores
}
