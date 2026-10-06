import { formatPrioridad } from '../../utils/format.js'

const ENCABEZADOS = ['Tipo', 'Categoría', 'Subcategoría', 'Prioridad', 'Tiempo esperado (horas)', 'Tickets en curso', 'Estado']

/** Valor de una celda CSV: entre comillas si lleva comas, comillas o saltos de línea. */
function celda(valor) {
  const texto = String(valor ?? '')
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

function estadoDe(elemento) {
  if (!elemento.activa) return 'Inactiva'
  return elemento.tipo === 'subcategoria' && !elemento.disponible ? 'Activa (categoría inactiva)' : 'Activa'
}

/** El catálogo (tal como se ve, con sus filtros) en CSV: una fila por categoría y por cada subcategoría. */
export function catalogoACsv(categorias) {
  const filas = categorias.flatMap((categoria) => [
    [
      'Categoría',
      categoria.nombre,
      '',
      formatPrioridad(categoria.prioridadPorDefecto),
      categoria.tiempoEsperadoHoras,
      categoria.ticketsEnCurso,
      estadoDe(categoria),
    ],
    ...categoria.subcategorias.map((subcategoria) => [
      'Subcategoría',
      categoria.nombre,
      subcategoria.nombre,
      formatPrioridad(subcategoria.prioridadPorDefecto),
      subcategoria.tiempoEsperadoHoras,
      subcategoria.ticketsEnCurso,
      estadoDe(subcategoria),
    ]),
  ])
  return [ENCABEZADOS, ...filas].map((fila) => fila.map(celda).join(',')).join('\r\n')
}

/** Nombre del archivo con la fecha de Lima: «catalogo-servicios-2026-10-05.csv». */
export function nombreDelArchivo(fecha = new Date()) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(fecha)
  return `catalogo-servicios-${dia}.csv`
}

/** Descarga `contenido` como archivo. La marca BOM hace que Excel lea bien las tildes. */
export function descargarCsv(nombre, contenido) {
  const url = URL.createObjectURL(new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
