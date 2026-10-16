import { useState, useEffect } from 'react'
import { obtenerReporteSatisfaccionSupervisor } from '../../services/encuestas.service.js'
import Button from '../../shared/components/Button/Button.jsx'
import './SatisfaccionSupervisorPage.css'

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

  if (cargando) return <div className="page-loader">Cargando reporte de satisfacción...</div>

  return (
    <div className="satisfaccion-supervisor-grid">
      <div className="main-content-panel">
        <div className="panel-header">
          <div>
            <h2>Satisfacción por técnico y categoría</h2>
            <p>
              {reporte.totalRespondidas} encuestas respondidas | Tasa de respuesta {reporte.tasaRespuesta}% | Promedio general {reporte.promedioGeneral} de 5
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            Exportar
          </Button>
        </div>

        <div className="table-wrapper">
          <table className="tabla-satisfaccion">
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
                  <td colSpan={7} className="text-center text-muted">
                    No hay encuestas registradas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                reporte.tablaTecnicos.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.tecnicoNombre}</strong>
                    </td>
                    <td>{item.categoriaPrincipal}</td>
                    <td>
                      <strong>{item.general}</strong>
                    </td>
                    <td>{item.rapidez}</td>
                    <td>{item.trato}</td>
                    <td>{item.solucion}</td>
                    <td>{item.encuestasCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="satisfaccion-footnote">
          Climatización es la categoría con menor promedio (3.9). Rapidez es el aspecto peor calificado del área.
        </div>
      </div>

      <div className="sidebar-comentarios">
        <h3>Comentarios recibidos</h3>
        <div className="filter-select">
          <label htmlFor="filtro-puntaje-select">Filtrar por puntaje:</label>
          <select
            id="filtro-puntaje-select"
            value={filtroPuntaje}
            onChange={(e) => setFiltroPuntaje(e.target.value)}
          >
            <option value="todos">Todos los puntajes</option>
            <option value="1_3">Puntaje: 1 a 3</option>
            <option value="4_5">Puntaje: 4 a 5</option>
          </select>
        </div>

        <div className="comentarios-list">
          {reporte.comentarios.length === 0 ? (
            <p className="no-comentarios text-muted">No hay comentarios para este filtro.</p>
          ) : (
            reporte.comentarios.map((c) => (
              <div key={c.id} className="comentario-card">
                <div className="card-header">
                  <span className="puntaje-badge">{c.puntaje}/5</span>
                  <span className="cat-text">
                    {c.categoria} - {c.tecnicoNombre}
                  </span>
                </div>
                <p className="comentario-body">"{c.comentario}"</p>
                <span className="fecha-text">{new Date(c.fecha).toLocaleDateString('es-PE')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
