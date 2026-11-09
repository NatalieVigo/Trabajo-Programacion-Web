import { Router } from 'express'
import * as cuentaController from '../controllers/cuenta.controller.js'
import { autenticar } from '../middlewares/autenticacion.js'

// /api/cuenta — Mi cuenta (p10), para cualquier rol con sesión iniciada
const router = Router()

router.use(autenticar)

router.get('/', cuentaController.obtener)
router.patch('/', cuentaController.actualizar)
router.get('/opciones', cuentaController.opciones)
router.get('/resumen', cuentaController.resumen)
router.get('/contadores', cuentaController.contadores)
router.put('/contrasena', cuentaController.cambiarContrasena)

export default router
