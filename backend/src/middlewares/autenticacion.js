import { validarSesion } from '../services/auth.service.js'
import { ServiceError, noAutenticado } from '../utils/ServiceError.js'

// Exige el encabezado "Authorization: Bearer <token>" y deja la cuenta en req.usuario.
export async function autenticar(req, res, next) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ')
  if (tipo !== 'Bearer' || !token) throw noAutenticado()
  const { sesionId, usuario } = await validarSesion(token)
  req.sesionId = sesionId
  req.usuario = usuario
  next()
}

// Protección por rol (HU-1): va después de autenticar y responde 403 si el rol no está en la lista.
export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      throw new ServiceError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para realizar esta acción.')
    }
    next()
  }
}
