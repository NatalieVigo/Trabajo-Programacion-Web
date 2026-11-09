import { Router } from 'express'
import authRoutes from './auth.routes.js'
import cuentaRoutes from './cuenta.routes.js'
import invitacionesRoutes from './invitaciones.routes.js'
import solicitudesAccesoRoutes from './solicitudesAcceso.routes.js'

// Todas las rutas de la API; cada historia agrega aquí las suyas.
export const rutas = Router()

// HU-1 Cuenta y acceso
rutas.use('/auth', authRoutes)
rutas.use('/cuenta', cuentaRoutes)
rutas.use('/invitaciones', invitacionesRoutes)
rutas.use('/solicitudes-acceso', solicitudesAccesoRoutes)
