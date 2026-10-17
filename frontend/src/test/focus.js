// jsdom no suelta el foco al deshabilitar un control como hace el navegador
export function soltarFoco() {
  const temporal = document.createElement('button')
  document.body.append(temporal)
  temporal.focus()
  temporal.remove()
}
