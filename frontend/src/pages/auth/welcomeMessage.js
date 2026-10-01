import { getFirstName, pluralize } from '../../utils/format.js'

const RESUMEN_POR_ROL = {
  usuario: ({ ticketsAbiertos, encuestasPendientes }) =>
    `Tienes ${pluralize(ticketsAbiertos, 'ticket abierto', 'tickets abiertos')} y ` +
    `${pluralize(encuestasPendientes, 'encuesta pendiente', 'encuestas pendientes')}.`,
  tecnico: ({ asignados }) => `Tienes ${pluralize(asignados, 'ticket asignado', 'tickets asignados')}.`,
  supervisor: ({ colaSinAsignar }) =>
    `Hay ${pluralize(colaSinAsignar, 'ticket sin asignar', 'tickets sin asignar')} en la cola.`,
}

/**
 * Bienvenida tras iniciar sesión (p05), con un lenguaje neutro y el resumen propio de cada rol:
 * «Te damos la bienvenida, Camila. Tienes 3 tickets abiertos y 1 encuesta pendiente.». Sin contadores, solo saluda.
 */
export function buildWelcomeMessage(usuario, contadores) {
  const saludo = `Te damos la bienvenida, ${getFirstName(usuario.nombres)}.`
  const resumen = contadores && RESUMEN_POR_ROL[usuario.rol]?.(contadores)
  return resumen ? `${saludo} ${resumen}` : saludo
}
