/**
 * Deja el foco en <body>, como hacen los navegadores cuando el control enfocado se deshabilita (jsdom, en cambio,
 * lo mantiene en el control deshabilitado y no deja quitárselo con blur()).
 */
export function soltarFoco() {
  const temporal = document.createElement('button')
  document.body.append(temporal)
  temporal.focus()
  temporal.remove()
}
