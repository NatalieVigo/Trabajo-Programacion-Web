import { pluralize } from '../../utils/format.js'
import { nombreDeTipo } from './catalogoFormat.js'

/** Opciones de la confirmación explícita para desactivar algo con tickets en curso (HU-2 · 2.6). */
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

/**
 * Ejecuta `operacion(confirmado)` y, si desactiva algo con tickets en curso, antes pide la confirmación con
 * `confirm`. Si el servicio responde 409 OPEN_TICKETS (empezó a tenerlos después de cargar la página), la pide con la
 * cantidad actual y vuelve a intentarlo. Devuelve { cancelado: true } si la persona no confirma, o { resultado }.
 */
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
