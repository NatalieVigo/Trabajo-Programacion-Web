import { formatPrioridad } from '../../utils/format.js'

/** Tiempo de referencia por prioridad, en horas hábiles desde el registro del ticket. */
export const TIEMPOS_ATENCION = [
  {
    prioridad: 'critica',
    horas: 2,
    criterio: 'Impide dictar clases o pone en riesgo la seguridad de las personas.',
  },
  {
    prioridad: 'alta',
    horas: 8,
    criterio: 'Afecta una clase o un servicio en curso, aunque existe una alternativa temporal.',
  },
  {
    prioridad: 'media',
    horas: 24,
    criterio: 'Dificulta el uso normal del ambiente sin detener la actividad.',
  },
  {
    prioridad: 'baja',
    horas: 72,
    criterio: 'Fallas menores o mejoras que pueden programarse.',
  },
]

// «Crítica 2 h · alta 8 h · media 24 h · baja 72 h hábiles.»
const resumenTiempos = `${TIEMPOS_ATENCION.map(({ prioridad, horas }, index) => {
  const etiqueta = formatPrioridad(prioridad)
  return `${index === 0 ? etiqueta : etiqueta.toLowerCase()} ${horas} h`
}).join(' · ')} hábiles.`

export const DESTACADOS = [
  {
    titulo: 'Qué se reporta',
    texto: 'Audiovisuales, climatización, redes, mobiliario, eléctrico, limpieza y cerraduras.',
  },
  {
    titulo: 'Cómo se prioriza',
    texto: 'Crítica, alta, media y baja según el impacto en clases y en la seguridad.',
  },
  {
    titulo: 'Tiempo de atención',
    texto: resumenTiempos,
  },
  {
    titulo: 'Emergencias',
    texto: 'Fugas de agua o riesgo eléctrico: llama al anexo 30111 y registra el ticket después.',
    resaltado: true,
  },
]

export const PASOS = [
  {
    titulo: 'Ingresa con tu correo institucional',
    texto: 'Usa tu cuenta @ulima.edu.pe o @aloe.ulima.edu.pe. Si aún no tienes una, regístrate en un minuto.',
  },
  {
    titulo: 'Registra el ticket',
    texto:
      'Elige la categoría, indica el ambiente con el código que aparece en la puerta (por ejemplo, A-201) y describe qué falla y desde cuándo.',
  },
  {
    titulo: 'El supervisor lo prioriza y asigna',
    texto: 'Según el impacto en clases y en la seguridad, el ticket recibe una prioridad y un técnico el mismo día.',
  },
  {
    titulo: 'Sigue la atención y califícala',
    texto: 'Revisa el avance desde «Mis tickets» y, cuando se cierre, responde la encuesta de satisfacción.',
  },
]
