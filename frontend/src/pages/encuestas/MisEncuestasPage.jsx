import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { obtenerEncuestasUsuario } from '../../services/encuestas.service.js'
import Button from '../../shared/components/Button/Button.jsx'
import './MisEncuestasPage.css'

export default function MisEncuestasPage() {
  const { user, usuario } = useAuth()
  const currentUser = user || usuario
  const navigate = useNavigate()
  const [data, setData] = useState({ encuestas: [], promedioGeneral: 0, totalRespondidas: 0 })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (currentUser?.id) {
        try {
          const res = await obtenerEncuestasUsuario(currentUser.id)
          setData(res)
        } finally {
          setCargando(false)
        }
      } else {
        setCargando(false)
      }
    }
    cargar()
  }, [currentUser?.id])

  if (cargando) return <div className="page-loader">Cargando encuestas...</div>

  return (
    <div className="mis-encuestas-page">
      <div className="header-summary">
        <h2>Mis encuestas</h2>
        <p>
          {data.totalRespondidas} {data.totalRespondidas === 1 ? 'encuesta respondida' : 'encuestas respondidas'} | Promedio que diste: <strong>{data.promedioGeneral} de 5</strong>
        </p>
      </div>

      {data.encuestas.length === 0 ? (
        <div className="estado-vacio-encuestas">
          <p className="vacio-titulo">Aún no respondes encuestas</p>
          <p className="vacio-subtitulo">Cuando se cierre uno de tus tickets te pediremos calificar la atención.</p>
          <Button variant="primary" onClick={() => navigate('/usuario/tickets')}>
            Ver mis tickets
          </Button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="encuestas-table">
            <thead>
              <tr>
                <th>TICKET / ASUNTO</th>
                <th>TÉCNICO</th>
                <th>RESPONDIDA</th>
                <th>PUNTAJE</th>
                <th>PLAZO DE EDICIÓN</th>
              </tr>
            </thead>
            <tbody>
              {data.encuestas.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong className="mono-code">{e.codigoTicket}</strong>
                    <div className="asunto-text">{e.asunto}</div>
                  </td>
                  <td>{e.tecnicoNombre}</td>
                  <td>{new Date(e.fechaRespuesta).toLocaleDateString('es-PE')}</td>
                  <td>
                    <span className="badge-rating">{e.puntajeGeneral}/5</span>
                  </td>
                  <td>
                    {e.editable ? (
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => navigate(`/usuario/encuestas/${e.codigoTicket}/evaluar`)}
                      >
                        Editar encuesta
                      </Button>
                    ) : (
                      <span className="text-muted">Plazo vencido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
