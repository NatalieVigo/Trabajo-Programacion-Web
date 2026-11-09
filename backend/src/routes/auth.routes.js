import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { autenticar } from '../middlewares/autenticacion.js'

// /api/auth — inicio y cierre de sesión, registro y recuperación de contraseña (p04 a p09)
const router = Router()

router.post('/login', authController.login)
router.post('/logout', autenticar, authController.logout)

router.post('/registro', authController.registro)
router.get('/registro/opciones', authController.opcionesRegistro)
router.get('/correo-disponible', authController.correoDisponible)

router.post('/recuperar-contrasena', authController.recuperarContrasena)
router.get('/restablecer-contrasena/:token', authController.validarEnlace)
router.post('/restablecer-contrasena/:token', authController.restablecerContrasena)

export default router
