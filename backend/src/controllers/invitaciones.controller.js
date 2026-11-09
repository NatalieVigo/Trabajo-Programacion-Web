import * as invitacionesService from '../services/invitaciones.service.js'

export async function obtener(req, res) {
  res.json(await invitacionesService.obtenerPorToken(req.params.token))
}

export async function opciones(req, res) {
  res.json(await invitacionesService.opciones(req.params.token))
}

export async function aceptar(req, res) {
  res.status(201).json(await invitacionesService.aceptar(req.params.token, req.body))
}

export async function rechazar(req, res) {
  res.json(await invitacionesService.rechazar(req.params.token))
}

export async function crear(req, res) {
  res.status(201).json(await invitacionesService.crear(req.body, req.usuario.id))
}
