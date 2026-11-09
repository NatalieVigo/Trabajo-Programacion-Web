import * as authService from '../services/auth.service.js'
import * as usuariosService from '../services/usuarios.service.js'

// Los controladores solo leen la petición, llaman al servicio y responden; no tocan la base (§7).

export async function login(req, res) {
  res.json(await authService.iniciarSesion(req.body))
}

export async function logout(req, res) {
  await authService.cerrarSesion(req.sesionId)
  res.status(204).end()
}

export async function registro(req, res) {
  res.status(201).json(await usuariosService.registrar(req.body))
}

export async function opcionesRegistro(req, res) {
  res.json(await usuariosService.opcionesRegistro())
}

export async function correoDisponible(req, res) {
  res.json(await usuariosService.correoDisponible(req.query.correo))
}

export async function recuperarContrasena(req, res) {
  res.json(await authService.solicitarRecuperacion(req.body))
}

export async function validarEnlace(req, res) {
  res.json(await authService.validarTokenRecuperacion(req.params.token))
}

export async function restablecerContrasena(req, res) {
  res.json(await authService.restablecerPassword(req.params.token, req.body))
}
