import { pluralize } from '../../utils/format.js'
import { nombreDeTipo } from './catalogoFormat.js'

export function confirmacionDeDesactivacion(elemento, ticketsEnCurso) {
  const tipo = nombreDeTipo(elemento.tipo)
  return {
    title: `¿Desactivar la ${tipo}?`,
    message:
      `«${elemento.nombre}» tiene ${pluralize(ticketsEnCurso, 'ticket en curso', 'tickets en curso')}. ` +
      'Seguirán atendiéndose hasta su cierre, pero no se podrán registrar tickets nuevos en ella.',
    confirmText: `Desactivar ${tipo}`,
    variant: 'destructive',
  }
}

// pide confirmar si hay tickets en curso; si aparecieron después, pregunta y reintenta
export async function desactivarConfirmando({ elemento, desactiva, confirm, operacion }) {
  const preguntar = (ticketsEnCurso) => confirm(confirmacionDeDesactivacion(elemento, ticketsEnCurso))
  let confirmado = false
  if (desactiva && elemento.ticketsEnCurso > 0) {
    if (!(await preguntar(elemento.ticketsEnCurso))) return { cancelado: true }
    confirmado = true
  }
  try {
    return { resultado: await operacion(confirmado) }
  } catch (error) {
    if (error.code !== 'OPEN_TICKETS' || confirmado) throw error
    if (!(await preguntar(error.details.ticketsEnCurso))) return { cancelado: true }
    return { resultado: await operacion(true) }
  }
}
