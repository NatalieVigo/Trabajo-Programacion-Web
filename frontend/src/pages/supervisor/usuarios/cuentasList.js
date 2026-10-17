export const FILTROS_CUENTAS = Object.freeze({ busqueda: '', rol: '', estado: '', unidad: '' })

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function filtrarCuentas(cuentas, filtros) {
  const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean)
  return cuentas.filter((u) => palabras.every((p) => normalizar(`${u.nombre} ${u.correo}`).includes(p)) &&
    (!filtros.rol || u.rol === filtros.rol) && (!filtros.estado || u.estado === filtros.estado) && (!filtros.unidad || u.unidad === filtros.unidad))
}

// solo columnas públicas, nunca la cuenta completa
export function cuentasAFilas(cuentas) {
  return [['Usuario', 'Correo', 'Rol', 'Unidad o especialidad', 'Tickets reportados', 'Estado'],
    ...cuentas.map((u) => [u.nombre, u.correo, u.rol, u.rol === 'tecnico' ? u.especialidad : u.unidad, u.ticketsReportados, u.estado])]
}
