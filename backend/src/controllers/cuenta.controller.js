import * as authService from '../services/auth.service.js'
import * as resumenService from '../services/resumen.service.js'
import * as usuariosService from '../services/usuarios.service.js'

// req.usuario lo deja el middleware autenticar

export async function obtener(req, res) {
  res.json(await usuariosService.obtenerCuenta(req.usuario.id))
}

export async function actualizar(req, res) {
  res.json(await usuariosService.actualizarPerfil(req.usuario.id, req.body))
}

export async function opciones(req, res) {
  res.json(await usuariosService.opcionesCuenta())
}

export async function resumen(req, res) {
  res.json(await resumenService.obtenerResumenCuenta(req.usuario))
}

export async function contadores(req, res) {
  res.json(await resumenService.obtenerContadores(req.usuario))
}

export async function cambiarContrasena(req, res) {
  res.json(await authService.cambiarPassword(req.usuario.id, req.body))
}
