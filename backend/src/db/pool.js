import mysql from 'mysql2/promise'
import { config } from '../config.js'

// las columnas BOOLEAN de MySQL son TINYINT(1); aquí vuelven como true o false
function booleanos(field, next) {
  if (field.type === 'TINY' && field.length === 1) {
    const valor = field.string()
    return valor === null ? null : valor === '1'
  }
  return next()
}

// Conexiones reutilizables a MySQL. Las fechas se guardan y se leen en UTC.
export const pool = mysql.createPool({
  ...config.db,
  timezone: 'Z',
  charset: 'utf8mb4',
  connectionLimit: 10,
  typeCast: booleanos,
})

// todo lo que haga operacion se confirma junto o se deshace junto
export async function enTransaccion(operacion) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const resultado = await operacion(conexion)
    await conexion.commit()
    return resultado
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}

// ids del contrato de datos, como 'usr-011'; FOR UPDATE evita que dos altas tomen el mismo número
export async function siguienteId(db, tabla, prefijo, digitos = 3) {
  const [[{ ultimo }]] = await db.query(
    `SELECT MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)) AS ultimo FROM ${tabla} WHERE id LIKE ? FOR UPDATE`,
    [prefijo.length + 2, `${prefijo}-%`],
  )
  return `${prefijo}-${String(Number(ultimo ?? 0) + 1).padStart(digitos, '0')}`
}
