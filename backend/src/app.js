import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js'
import { rutas } from './routes/index.js'

// La app va aparte de server.js para que las pruebas la usen sin abrir un puerto.
export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: config.origenFrontend }))
app.use(express.json())

app.use('/api', rutas)

app.use(rutaNoEncontrada)
app.use(manejarErrores)
