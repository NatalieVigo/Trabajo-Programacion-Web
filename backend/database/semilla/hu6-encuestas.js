import { insertarFilas } from './insertarFilas.js'

// HU-6 (mínimo): solo las columnas que lee HU-1
export async function cargarEncuestas(conexion, seed) {
  await insertarFilas(
    conexion,
    'encuestas',
    ['id', 'ticket_id', 'usuario_id'],
    seed.encuestas.map(({ id, ticketId, usuarioId }) => [id, ticketId, usuarioId]),
  )
}
