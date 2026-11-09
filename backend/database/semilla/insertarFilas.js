// inserta todas las filas en una sola consulta; las fechas del seed llegan como texto ISO
export async function insertarFilas(conexion, tabla, columnas, filas) {
  if (filas.length === 0) return
  await conexion.query(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES ?`, [filas])
}

export const fecha = (valor) => (valor ? new Date(valor) : null)
