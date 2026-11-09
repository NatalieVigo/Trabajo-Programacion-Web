import { Router } from 'express'
import * as invitacionesController from '../controllers/invitaciones.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/invitaciones — alta de técnicos y supervisores por invitación (p07)
const router = Router()

router.post('/', autenticar, permitirRoles('supervisor'), invitacionesController.crear)

// el invitado todavía no tiene cuenta: el token del enlace es su acceso
router.get('/:token', invitacionesController.obtener)
router.get('/:token/opciones', invitacionesController.opciones)
router.post('/:token/aceptar', invitacionesController.aceptar)
router.post('/:token/rechazar', invitacionesController.rechazar)

export default router
