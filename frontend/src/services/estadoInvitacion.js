/** Una invitación pendiente cuyo plazo ya pasó está «vencida». Es un estado derivado: no se guarda. */
export function estadoEfectivo(invitacion, ahora = Date.now()) {
  const vencida = invitacion.estado === 'pendiente' && Date.parse(invitacion.venceEn) < ahora
  return vencida ? 'vencida' : invitacion.estado
}
