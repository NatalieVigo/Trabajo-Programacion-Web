import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// usa la conexión del .env, pero sobre una base aparte para no borrar la de desarrollo
if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  test: {
    environment: 'node',
    // los archivos comparten la base, así que corren uno tras otro
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      DB_NAME: `${process.env.DB_NAME ?? 'mesa_ayuda'}_test`,
      JWT_SECRET: 'clave-solo-para-pruebas',
      CORREOS_SIMULADOS: 'true',
    },
  },
})
