import { Router } from 'express'
import * as solicitudesAccesoController from '../controllers/solicitudesAcceso.controller.js'
import { autenticar } from '../middlewares/autenticacion.js'

// /api/solicitudes-acceso — botón "Solicitar acceso" de la vista 403 (p11)
const router = Router()

router.post('/', autenticar, solicitudesAccesoController.crear)

export default router
