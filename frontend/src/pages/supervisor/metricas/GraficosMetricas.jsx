export function BarrasMetricas({ datos, ambiente = false }) {
  const maximo = Math.max(1, ...datos.map((d) => d.total))
  if (!datos.length) return <p className="text-muted">No hay tickets en este periodo.</p>
  return <ul className={`hu7-barras ${ambiente ? 'hu7-barras--ambientes' : ''}`}>
    {datos.map((d) => <li key={d.id}>
      <div className="hu7-barras__etiqueta"><span>{d.nombre}</span><span>{d.total}</span></div>
      <div className="hu7-barras__pista" aria-hidden="true"><div style={{ width: `${d.total / maximo * 100}%` }} /></div>
    </li>)}
  </ul>
}

export function GraficoEstados({ datos, total }) {
  let recorrido = 0
  const sectores = datos.map((dato) => {
    const inicio = recorrido
    recorrido += total ? dato.total / total * 100 : 0
    return `var(--color-status-${dato.id.replaceAll('_', '-')}) ${inicio}% ${recorrido}%`
  })
  return <div className="hu7-estados">
    <div className="hu7-anillo" aria-hidden="true" style={{ background: total ? `conic-gradient(${sectores.join(',')})` : 'var(--color-border)' }}><div><strong>{total}</strong><span>tickets</span></div></div>
    <ul aria-label="Tickets por estado">{datos.map((d) => <li key={d.id}><span className="hu7-estados__color" style={{ background: `var(--color-status-${d.id.replaceAll('_', '-')})` }} aria-hidden="true" />{d.nombre} · {d.total}</li>)}</ul>
  </div>
}
