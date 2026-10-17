import { useState, useEffect } from 'react'
import { obtenerReporteSatisfaccionSupervisor } from '../../services/encuestas.service.js'
import { Button, Card, PageHeader, SelectInput } from '../../shared/components'
import { formatDate } from '../../utils/format.js'
import './SatisfaccionSupervisorPage.css'

// rojo hasta 2, ámbar en 3 y verde desde 4
function tonoDelPuntaje(puntaje) {
  if (puntaje <= 2) return 'bajo'
  if (puntaje === 3) return 'medio'
  return 'alto'
}

export default function SatisfaccionSupervisorPage() {
  const [reporte, setReporte] = useState({
    tablaTecnicos: [],
    comentarios: [],
    totalRespondidas: 0,
    promedioGeneral: 0,
    tasaRespuesta: 0,
  })
  const [filtroPuntaje, setFiltroPuntaje] = useState('todos')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await obtenerReporteSatisfaccionSupervisor({ filtroPuntajeComentario: filtroPuntaje })
        setReporte(res)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [filtroPuntaje])

  if (cargando) {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando reporte de satisfacción…
        </p>
      </Card>
    )
  }

  return (
    <div className="satisfaccion">
      <PageHeader
        title="Satisfacción por técnico y categoría"
        subtitle={`${reporte.totalRespondidas} encuestas respondidas · tasa de respuesta ${reporte.tasaRespuesta} % · promedio general ${reporte.promedioGeneral} de 5`}
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            Exportar
          </Button>
        }
      />

      <div className="satisfaccion__layout">
        <section className="satisfaccion__tabla" aria-label="Satisfacción por técnico">
          <div className="satisfaccion__scroll">
            <table>
              <thead>
                <tr>
                  <th>TÉCNICO</th>
                  <th>CATEGORÍA PRINCIPAL</th>
                  <th>GENERAL</th>
                  <th>RAPIDEZ</th>
                  <th>TRATO</th>
                  <th>SOLUCIÓN</th>
                  <th>ENCUESTAS</th>
                </tr>
              </thead>
              <tbody>
                {reporte.tablaTecnicos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="satisfaccion__vacio">
                      No hay encuestas registradas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  reporte.tablaTecnicos.map((item, idx) => (
                    <tr key={idx}>
                      <td className="satisfaccion__tecnico">{item.tecnicoNombre}</td>
                      <td className="satisfaccion__secundario">{item.categoriaPrincipal}</td>
                      <td className="satisfaccion__general">{item.general}</td>
                      <td>{item.rapidez}</td>
                      <td>{item.trato}</td>
                      <td>{item.solucion}</td>
                      <td className="satisfaccion__total">{item.encuestasCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="satisfaccion__nota">
            Climatización es la categoría con menor promedio (3.9). Rapidez es el aspecto peor calificado del área.
          </p>
        </section>

        <Card as="aside" className="satisfaccion__comentarios" aria-labelledby="satisfaccion-comentarios">
          <div className="satisfaccion__comentarios-cabecera">
            <h2 id="satisfaccion-comentarios" className="card__title">
              Comentarios recibidos
            </h2>
            <div className="satisfaccion__filtro">
              <label className="visually-hidden" htmlFor="filtro-puntaje-select">
                Filtrar por puntaje:
              </label>
              <SelectInput
                id="filtro-puntaje-select"
                value={filtroPuntaje}
                onChange={(e) => setFiltroPuntaje(e.target.value)}
                options={[
                  { value: 'todos', label: 'Puntaje: todos' },
                  { value: '1_3', label: 'Puntaje: 1 a 3' },
                  { value: '4_5', label: 'Puntaje: 4 a 5' },
                ]}
              />
            </div>
          </div>

          {reporte.comentarios.length === 0 ? (
            <p className="satisfaccion__sin-comentarios">No hay comentarios para este filtro.</p>
          ) : (
            <ul className="satisfaccion__lista">
              {reporte.comentarios.map((c) => (
                <li key={c.id} className="satisfaccion__comentario">
                  <p className="satisfaccion__meta">
                    <span className={`satisfaccion__puntaje satisfaccion__puntaje--${tonoDelPuntaje(c.puntaje)}`}>
                      {c.puntaje} / 5
                    </span>{' '}
                    {c.categoria} · {c.tecnicoNombre} · {formatDate(c.fecha)}
                  </p>
                  <p className="satisfaccion__texto">«{c.comentario}»</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
