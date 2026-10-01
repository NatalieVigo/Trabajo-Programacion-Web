export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomHex(byteLength = 16) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)))
}

/** Siguiente id correlativo de una tabla: nextId('usr', usuarios) → "usr-011". */
export function nextId(prefix, rows, digits = 3) {
  const start = `${prefix}-`
  const max = rows.reduce((current, row) => {
    const id = String(row.id ?? '')
    const suffix = id.startsWith(start) ? id.slice(start.length) : ''
    return /^\d+$/.test(suffix) ? Math.max(current, Number(suffix)) : current
  }, 0)
  return `${start}${String(max + 1).padStart(digits, '0')}`
}
