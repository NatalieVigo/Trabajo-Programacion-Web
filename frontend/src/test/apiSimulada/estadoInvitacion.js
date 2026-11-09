// 'vencida' no se guarda, se calcula con la fecha de vencimiento
export function estadoEfectivo(invitacion, ahora = Date.now()) {
  const vencida = invitacion.estado === 'pendiente' && Date.parse(invitacion.venceEn) < ahora
  return vencida ? 'vencida' : invitacion.estado
}
