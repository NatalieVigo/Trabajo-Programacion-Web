import { apiFetch } from './apiClient.js'

export async function listarUsuarios(filtros = {}) {
  return apiFetch('/usuarios', {
    params: {
      rol: filtros.rol,
      estado: filtros.estado,
      unidad: filtros.unidad,
      q: filtros.q,
    },
  })
}

export async function obtenerFichaUsuario(usuarioId) {
  return apiFetch(`/usuarios/${encodeURIComponent(usuarioId)}`)
}

export async function bloquearCuenta(usuarioId, motivo) {
  return apiFetch(`/usuarios/${encodeURIComponent(usuarioId)}/bloquear`, {
    method: 'PATCH',
    body: { motivo },
  })
}

export async function desbloquearCuenta(usuarioId) {
  return apiFetch(`/usuarios/${encodeURIComponent(usuarioId)}/desbloquear`, {
    method: 'PATCH',
  })
}
