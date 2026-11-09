import { app } from './app.js'
import { config } from './config.js'

app.listen(config.puerto, () => {
  console.log(`API de la Mesa de Ayuda en http://localhost:${config.puerto}/api`)
})
