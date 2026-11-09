// Configuración desde variables de entorno; el repositorio no guarda credenciales (enunciado §7).

function requerida(nombre) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Copia .env.example como .env y complétalo.`)
  return valor
}

export const config = Object.freeze({
  puerto: Number(process.env.PORT ?? 3000),
  origenFrontend: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  db: Object.freeze({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'mesa_ayuda',
  }),
  jwtSecret: requerida('JWT_SECRET'),
  correosSimulados: process.env.CORREOS_SIMULADOS === 'true',
})
