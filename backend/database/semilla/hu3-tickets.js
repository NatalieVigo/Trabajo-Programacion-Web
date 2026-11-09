import { fecha, insertarFilas } from './insertarFilas.js'

// HU-3 (mínimo): solo las columnas que lee HU-1
export async function cargarTickets(conexion, seed) {
  await insertarFilas(
    conexion,
    'tickets',
    ['id', 'codigo', 'usuario_id', 'asignado_a', 'estado', 'cerrado_en'],
    seed.tickets.map((ticket) => [
      ticket.id, ticket.codigo, ticket.usuarioId, ticket.asignadoA, ticket.estado, fecha(ticket.cerradoEn),
    ]),
  )
}
