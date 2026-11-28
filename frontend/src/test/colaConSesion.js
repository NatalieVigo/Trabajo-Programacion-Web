import * as cola from '../services/cola.service.js'
import { guardarSesion } from './test-utils.jsx'

// Las pruebas de HU-4 de la entrega 1 pasaban quién hacía la acción como último argumento.
// Ahora la API lo saca del token, así que antes de cada llamada se guarda la sesión de esa cuenta.
const conSesion =
  (funcion) =>
  (...args) => {
    guardarSesion(args.at(-1))
    return funcion(...args)
  }

export const listarCola = conSesion(cola.listarCola)
export const listarBandeja = conSesion(cola.listarBandeja)
export const asignarTickets = conSesion(cola.asignarTickets)
export const cambiarPrioridadTickets = conSesion(cola.cambiarPrioridadTickets)
export const devolverTickets = conSesion(cola.devolverTickets)
export const autoasignarTicket = conSesion(cola.autoasignarTicket)
