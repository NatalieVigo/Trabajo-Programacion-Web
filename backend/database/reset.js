import { config } from '../src/config.js'
import { reiniciarBase } from './reiniciarBase.js'

// npm run db:reset — ojo: borra la base configurada en DB_NAME y la vuelve a crear
await reiniciarBase(config.db)
console.log(`Base «${config.db.database}» creada y cargada con el seed.`)
