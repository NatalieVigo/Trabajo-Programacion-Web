import * as solicitudesAccesoService from '../services/solicitudesAcceso.service.js'

export async function crear(req, res) {
  res.status(201).json(await solicitudesAccesoService.solicitar(req.usuario.id, req.body))
}
