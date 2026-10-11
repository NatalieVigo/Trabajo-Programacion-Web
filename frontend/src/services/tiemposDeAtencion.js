/**
 * Tiempos de la atención de un ticket a partir de sus cambios de estado (HU-5 · 5.4). Paso interno de los servicios
 * de atención: no lee ni escribe datos. `estados` son los eventos de tipo «estado» del historial, del más antiguo al
 * más reciente.
 */

/**
 * Cuánto permaneció el ticket en cada estado por el que pasó: [{ estado, desde, ms, enCurso }], en el mismo orden.
 * Cada etapa dura hasta el cambio siguiente y la última, que sigue en curso, hasta `ahora`. «Cerrado» no acumula
 * tiempo: el ticket ya no se atiende.
 */
export function etapasDe(estados, ahora = Date.now()) {
  return estados.map((evento, indice) => {
    const desde = Date.parse(evento.creadoEn)
    const siguiente = estados[indice + 1]
    const hasta = siguiente ? Date.parse(siguiente.creadoEn) : ahora
    const cerrado = evento.estado === 'cerrado'
    return {
      estado: evento.estado,
      desde: evento.creadoEn,
      ms: cerrado ? 0 : Math.max(hasta - desde, 0),
      enCurso: !siguiente && !cerrado,
    }
  })
}

/**
 * Tiempos de la atención: { totalMs, enEsperaMs, atencionMs }. El total va desde el registro hasta el cierre (o hasta
 * `ahora` si sigue en curso) y el tiempo de atención es el total sin las esperas, que no cuentan para el tiempo
 * esperado.
 */
export function tiemposDe(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  const sumar = (seleccion) => seleccion.reduce((total, { ms }) => total + ms, 0)
  const totalMs = sumar(etapas)
  const enEsperaMs = sumar(etapas.filter(({ estado }) => estado === 'en_espera'))
  return { totalMs, enEsperaMs, atencionMs: totalMs - enEsperaMs }
}

/** Orden en que se muestran las etapas de la atención. El cierre no es una etapa: no acumula tiempo. */
const ORDEN_DE_ETAPAS = Object.freeze(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

/**
 * Tiempo total que el ticket pasó en cada estado, sumando todas las veces que estuvo en él: [{ estado, ms }], solo
 * con los estados por los que pasó.
 */
export function tiempoPorEstado(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  return ORDEN_DE_ETAPAS.filter((estado) => etapas.some((etapa) => etapa.estado === estado)).map((estado) => ({
    estado,
    ms: etapas.filter((etapa) => etapa.estado === estado).reduce((total, { ms }) => total + ms, 0),
  }))
}
