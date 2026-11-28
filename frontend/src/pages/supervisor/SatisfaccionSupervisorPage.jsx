import { useCallback, useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { obtenerReporteSatisfaccionSupervisor } from '../../services/encuestas.service.js'
import { rangoMetricasInicial } from '../../services/metricas.service.js'
import { Button, Card, PageHeader, SelectInput } from '../../shared/components'
import { formatDate } from '../../utils/format.js'
import PeriodoFiltro from './metricas/PeriodoFiltro.jsx'
import './metricas/Metricas.css'
import './SatisfaccionSupervisorPage.css'

const ASPECTOS = Object.freeze({ rapidez: 'Rapidez', trato: 'Trato', solucion: 'Solución' })

// rojo hasta 2, ámbar en 3 y verde desde 4
function tonoDelPuntaje(puntaje) {
  if (puntaje <= 2) return 'bajo'
  if (puntaje === 3) return 'medio'
  return 'alto'
}

const conUnDecimal = (valor) => (valor === null || valor === undefined ? '—' : Number(valor).toFixed(1))

// la categoría con menor promedio y el aspecto peor calificado del periodo
function notaDelPeriodo({ porCategoria, promedioPorAspecto }) {
  if (porCategoria.length === 0) return null
  const [menor] = [...porCategoria].sort((a, b) => a.general - b.general || a.categoria.localeCompare(b.categoria))
  const [[aspecto]] = Object.entries(promedioPorAspecto).sort(([, a], [, b]) => a - b)
  return `${menor.categoria} es la categoría con menor promedio (${conUnDecimal(menor.general)}). ${ASPECTOS[aspecto]} es el aspecto peor calificado del área.`
}

function TablaPromedios({ titulo, columna, filas, nombre, secundaria }) {
  const columnas = secundaria ? 7 : 6
  return (
    <div className="satisfaccion__scroll">
      <table aria-label={titulo}>
        <thead>
          <tr>
            <th>{columna}</th>
            {secundaria && <th>{secundaria.titulo}</th>}
            <th>GENERAL</th>
            <th>RAPIDEZ</th>
            <th>TRATO</th>
            <th>SOLUCIÓN</th>
            <th>ENCUESTAS</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas} className="satisfaccion__vacio">
                No hay encuestas respondidas en este periodo.
              </td>
            </tr>
          ) : (
            filas.map((fila) => (
              <tr key={nombre(fila)}>
                <td className="satisfaccion__tecnico">{nombre(fila)}</td>
                {secundaria && <td className="satisfaccion__secundario">{secundaria.valor(fila)}</td>}
                <td className="satisfaccion__general">{conUnDecimal(fila.general)}</td>
                <td>{conUnDecimal(fila.rapidez)}</td>
                <td>{conUnDecimal(fila.trato)}</td>
                <td>{conUnDecimal(fila.solucion)}</td>
                <td className="satisfaccion__total">{fila.encuestasCount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function SatisfaccionSupervisorPage() {
  const [rango, setRango] = useState(rangoMetricasInicial)
  const [filtroPuntaje, setFiltroPuntaje] = useState('todos')
  const cargar = useCallback(
    () => obtenerReporteSatisfaccionSupervisor({ ...rango, filtroPuntajeComentario: filtroPuntaje }),
    [rango, filtroPuntaje],
  )
  const consulta = useAsyncData(cargar)
  const reporte = consulta.data
  useDocumentTitle('Satisfacción por técnico y categoría')

  const subtitulo = reporte
    ? `${reporte.totalRespondidas} encuestas respondidas · tasa de respuesta ${reporte.tasaRespuesta} % · promedio general ${reporte.totalRespondidas ? conUnDecimal(reporte.promedioGeneral) : '—'} de 5`
    : undefined

  return (
    <div className="satisfaccion">
      <PageHeader
        title="Satisfacción por técnico y categoría"
        subtitle={subtitulo}
        actions={
          <>
            <PeriodoFiltro rango={rango} onChange={setRango} />
            <Button variant="secondary" onClick={() => window.print()}>
              Exportar
            </Button>
          </>
        }
      />

      {consulta.status === 'loading' && !reporte && (
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando reporte de satisfacción…
          </p>
        </Card>
      )}
      {consulta.status === 'error' && (
        <Card>
          <p role="alert">{consulta.error?.message ?? 'No se pudo cargar el reporte de satisfacción.'}</p>
        </Card>
      )}

      {reporte && (
        <div className="satisfaccion__layout">
          <div className="satisfaccion__principal">
            <section className="satisfaccion__tabla" aria-label="Satisfacción por técnico">
              <TablaPromedios
                titulo="Satisfacción por técnico"
                columna="TÉCNICO"
                filas={reporte.tablaTecnicos}
                nombre={(fila) => fila.tecnicoNombre}
                secundaria={{ titulo: 'CATEGORÍA PRINCIPAL', valor: (fila) => fila.categoriaPrincipal }}
              />
              {notaDelPeriodo(reporte) && <p className="satisfaccion__nota">{notaDelPeriodo(reporte)}</p>}
            </section>

            <section className="satisfaccion__tabla" aria-label="Satisfacción por categoría">
              <TablaPromedios
                titulo="Satisfacción por categoría"
                columna="CATEGORÍA"
                filas={reporte.porCategoria}
                nombre={(fila) => fila.categoria}
              />
            </section>
          </div>

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
      )}
    </div>
  )
}
