import { LANDING_SECTIONS } from '../../routes/routePaths.js'
import { formatPrioridad } from '../../utils/format.js'

/** Tiempo de referencia por prioridad, en horas hábiles desde el registro del ticket. */
const TIEMPOS_ATENCION = [
  { prioridad: 'critica', horas: 2 },
  { prioridad: 'alta', horas: 8 },
  { prioridad: 'media', horas: 24 },
  { prioridad: 'baja', horas: 72 },
]

// «Crítica 2 h · alta 8 h · media 24 h · baja 72 h hábiles.»
const resumenTiempos = `${TIEMPOS_ATENCION.map(({ prioridad, horas }, index) => {
  const etiqueta = formatPrioridad(prioridad)
  return `${index === 0 ? etiqueta : etiqueta.toLowerCase()} ${horas} h`
}).join(' · ')} hábiles.`

/**
 * Los cuatro recuadros de p03. `seccion` es el destino de los enlaces «Categorías de servicio» y «Tiempos de
 * atención» de la cabecera y del pie.
 */
export const DESTACADOS = [
  {
    titulo: 'Qué se reporta',
    texto: 'Audiovisuales, climatización, redes, mobiliario, eléctrico, limpieza y cerraduras.',
    seccion: LANDING_SECTIONS.categorias,
  },
  {
    titulo: 'Cómo se prioriza',
    texto: 'Crítica, alta, media y baja según el impacto en clases y en la seguridad.',
  },
  {
    titulo: 'Tiempo de atención',
    texto: resumenTiempos,
    seccion: LANDING_SECTIONS.tiempos,
  },
  {
    titulo: 'Emergencias',
    texto: 'Fugas de agua o riesgo eléctrico: llama al anexo 30111 y registra el ticket después.',
    resaltado: true,
  },
]
