// Tiempos de atención (HU-5). Los estados llegan del más antiguo al más reciente.

// cada etapa dura hasta el cambio siguiente; cerrado y cancelado no suman tiempo
export function etapasDe(estados, ahora = Date.now()) {
  return estados.map((evento, indice) => {
    const desde = Date.parse(evento.creadoEn)
    const siguiente = estados[indice + 1]
    const hasta = siguiente ? Date.parse(siguiente.creadoEn) : ahora
    const cerrado = ['cerrado', 'cancelado'].includes(evento.estado)
    return {
      estado: evento.estado,
      desde: evento.creadoEn,
      ms: cerrado ? 0 : Math.max(hasta - desde, 0),
      enCurso: !siguiente && !cerrado,
    }
  })
}

// el tiempo de atención es el total sin las esperas
export function tiemposDe(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  const sumar = (seleccion) => seleccion.reduce((total, { ms }) => total + ms, 0)
  const totalMs = sumar(etapas)
  const enEsperaMs = sumar(etapas.filter(({ estado }) => estado === 'en_espera'))
  return { totalMs, enEsperaMs, atencionMs: totalMs - enEsperaMs }
}

// el cierre no va porque no acumula tiempo
const ORDEN_DE_ETAPAS = Object.freeze(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

// suma todas las veces que pasó por cada estado
export function tiempoPorEstado(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  return ORDEN_DE_ETAPAS.filter((estado) => etapas.some((etapa) => etapa.estado === estado)).map((estado) => ({
    estado,
    ms: etapas.filter((etapa) => etapa.estado === estado).reduce((total, { ms }) => total + ms, 0),
  }))
}
