import { invitacionPath } from '../../routes/routePaths.js'
import { getFullName, pluralize } from '../../utils/format.js'

/** Filtros de la lista: '' muestra todas; los demás, un estado efectivo (una pendiente que venció está vencida). */
export const FILTROS_ESTADO = Object.freeze([
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aceptada', label: 'Aceptadas' },
  { value: 'vencida', label: 'Vencidas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: 'revocada', label: 'Revocadas' },
])

const ESTADOS = FILTROS_ESTADO.filter(({ value }) => value)

/** «Huamán» y «huaman» se buscan igual: sin tildes y en minúsculas. */
function normalizarBusqueda(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Cantidad de invitaciones por estado efectivo; '' guarda el total. */
export function contarPorEstado(invitaciones) {
  const conteo = Object.fromEntries(FILTROS_ESTADO.map(({ value }) => [value, 0]))
  conteo[''] = invitaciones.length
  invitaciones.forEach(({ estadoEfectivo }) => {
    conteo[estadoEfectivo] += 1
  })
  return conteo
}

/** Resumen para la cabecera, como en p33: «4 invitaciones · 2 pendientes, 1 aceptada, 1 vencida». */
export function resumirInvitaciones(conteo) {
  const total = pluralize(conteo[''], 'invitación', 'invitaciones')
  const porEstado = ESTADOS.filter(({ value }) => conteo[value] > 0).map(({ value, label }) =>
    pluralize(conteo[value], value, label.toLowerCase()),
  )
  return porEstado.length > 0 ? `${total} · ${porEstado.join(', ')}` : total
}

/** Invitaciones del `estado` elegido ('' = todas) cuyo nombre o correo contiene cada palabra de la `busqueda`. */
export function filtrarInvitaciones(invitaciones, { estado, busqueda }) {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
  return invitaciones.filter((invitacion) => {
    const texto = normalizarBusqueda(`${getFullName(invitacion)} ${invitacion.correo}`)
    return (!estado || invitacion.estadoEfectivo === estado) && palabras.every((palabra) => texto.includes(palabra))
  })
}

/** Enlace completo que el supervisor comparte con la persona invitada. */
export function enlaceDeInvitacion(token) {
  return new URL(invitacionPath(token), window.location.origin).href
}
