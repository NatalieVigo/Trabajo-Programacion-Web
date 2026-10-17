function celda(valor) {
  let texto = String(valor ?? '')
  if (typeof valor === 'string' && /^[\s]*[=+@-]/.test(texto)) texto = `'${texto}`
  return `"${texto.replaceAll('"', '""')}"`
}

export function filasACsv(filas) {
  return filas.map((fila) => fila.map(celda).join(',')).join('\r\n')
}

export function descargarFilasCsv(nombre, filas) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', filasACsv(filas)], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
