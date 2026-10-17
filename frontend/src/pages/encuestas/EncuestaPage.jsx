import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { obtenerEncuestaPorTicket, registrarEncuesta } from '../../services/encuestas.service.js'
import { obtenerTicketPorCodigo } from '../../services/atencion.service.js'
import { obtenerResumenCuenta } from '../../services/usuarios.service.js'
import { useToast } from '../../shared/components/Toast/useToast.js'
import Button from '../../shared/components/Button/Button.jsx'
import { Card, EmptyState } from '../../shared/components'
import './EncuestaPage.css'

const SIN_PENDIENTES = {
  titulo: 'No tienes encuestas pendientes',
  descripcion: 'Cuando se cierre uno de tus tickets podrás calificar la atención durante 7 días.',
}

const TICKET_NO_DISPONIBLE = {
  titulo: 'No encontramos un ticket cerrado tuyo con ese código',
  descripcion: 'Solo puedes calificar la atención de tus propios tickets una vez cerrados.',
}

export default function EncuestaPage() {
  const { codigoTicket } = useParams()
  const { user, usuario } = useAuth()
  const currentUser = user || usuario
  const navigate = useNavigate()
  const toast = useToast()

  const [ticket, setTicket] = useState(null)
  const [puntajeGeneral, setPuntajeGeneral] = useState(5)
  const [rapidez, setRapidez] = useState(5)
  const [trato, setTrato] = useState(5)
  const [solucion, setSolucion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [cargando, setCargando] = useState(true)
  const [noDisponible, setNoDisponible] = useState(null)
  const usuarioId = currentUser?.id

  useEffect(() => {
    async function CargarDatos() {
      try {
        // «Encuesta pendiente» (sin código): la que vence primero, igual que el contador del menú.
        let codigo = codigoTicket
        if (!codigo) {
          const resumen = await obtenerResumenCuenta(usuarioId)
          codigo = resumen.encuestaPendiente?.ticketCodigo
          if (!codigo) {
            setNoDisponible(SIN_PENDIENTES)
            return
          }
        }
        const t = await obtenerTicketPorCodigo(codigo)
        if (!t || t.usuarioId !== usuarioId || t.estado !== 'cerrado') {
          setNoDisponible(TICKET_NO_DISPONIBLE)
          return
        }
        setTicket(t)
        const codigoBuscado = t.codigo
        if (codigoBuscado) {
          const enc = await obtenerEncuestaPorTicket(codigoBuscado)
          if (enc) {
            setPuntajeGeneral(enc.puntajeGeneral)
            setRapidez(enc.rapidez)
            setTrato(enc.trato)
            setSolucion(enc.solucion)
            setComentario(enc.comentario || '')
          }
        }
      } catch {
        toast.showError('No se pudo cargar la información del ticket.')
      } finally {
        setCargando(false)
      }
    }
    CargarDatos()
  }, [codigoTicket, usuarioId, toast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const codigoFinal = codigoTicket || ticket?.codigo
    if (!codigoFinal) {
      toast.showError('No se encontró el ticket a evaluar.')
      return
    }
    try {
      await registrarEncuesta({
        codigoTicket: codigoFinal,
        usuarioId: currentUser?.id,
        puntajeGeneral,
        rapidez,
        trato,
        solucion,
        comentario,
      })
      toast.showSuccess(`Gracias, registramos tu encuesta del ticket ${codigoFinal}.`)
      navigate('/usuario/encuestas')
    } catch (err) {
      toast.showError(err.message || 'Error al guardar la encuesta.')
    }
  }

  const getTextoPuntaje = (puntaje) => {
    switch (puntaje) {
      case 1:
        return '1 · Muy insatisfecho'
      case 2:
        return '2 · Insatisfecho'
      case 3:
        return '3 · Regular'
      case 4:
        return '4 · Buena atención'
      case 5:
        return '5 · Excelente atención'
      default:
        return `${puntaje} · Calificación`
    }
  }

  if (cargando) return <div className="page-loader">Cargando encuesta...</div>

  if (noDisponible) {
    return (
      <Card>
        <EmptyState
          title={noDisponible.titulo}
          description={noDisponible.descripcion}
          action={
            <Button variant="secondary" onClick={() => navigate('/usuario/encuestas')}>
              Ver mis encuestas
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="encuesta-page-container">
      <div className="encuesta-form-card">
        <h2>¿Cómo fue la atención de tu ticket?</h2>
        <p className="encuesta-subtitle">
          Tu respuesta ayuda al área de Infraestructura a mejorar los tiempos y el trato. Toma menos de un minuto.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="rating-group">
            <label className="rating-label">PUNTAJE GENERAL</label>
            <div className="rating-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`btn-star ${puntajeGeneral === val ? 'active' : ''}`}
                  onClick={() => setPuntajeGeneral(val)}
                  aria-pressed={puntajeGeneral === val}
                >
                  {val}
                </button>
              ))}
              <span className="rating-hint">{getTextoPuntaje(puntajeGeneral)}</span>
            </div>
          </div>

          <div className="aspectos-grid">
            <span className="rating-label">CALIFICACIÓN POR ASPECTOS</span>

            <div className="aspecto-row">
              <span>Rapidez</span>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={rapidez === val ? 'selected' : ''}
                    onClick={() => setRapidez(val)}
                    aria-pressed={rapidez === val}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="aspecto-row">
              <span>Trato del técnico</span>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={trato === val ? 'selected' : ''}
                    onClick={() => setTrato(val)}
                    aria-pressed={trato === val}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="aspecto-row">
              <span>Solución del problema</span>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={solucion === val ? 'selected' : ''}
                    onClick={() => setSolucion(val)}
                    aria-pressed={solucion === val}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="comentario-group">
            <label htmlFor="comentario">COMENTARIO (OPCIONAL)</label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe aquí tu opinión sobre el servicio recibido..."
              maxLength={500}
            />
            <p className="privacy-note">
              Tu comentario lo lee el supervisor del área; el técnico lo ve sin tu nombre.
            </p>
          </div>

          <div className="actions-row">
            <Button type="submit" variant="primary">
              Enviar encuesta
            </Button>
            <Button type="button" variant="tertiary" onClick={() => navigate('/usuario/tickets')}>
              Responder después
            </Button>
          </div>
        </form>
      </div>

      <div className="ticket-summary-card">
        <h3>Ticket evaluado</h3>
        <p className="ticket-code">{ticket?.codigo}</p>
        <p className="ticket-asunto">{ticket?.asunto}</p>

        <div className="detail-list">
          <div>
            <span>Categoría:</span> <strong>{ticket?.categoriaNombre}</strong>
          </div>
          <div>
            <span>Ambiente:</span> <strong>{ticket?.ambienteCodigo}</strong>
          </div>
          <div>
            <span>Técnico:</span> <strong>{ticket?.tecnicoNombre || 'Atendido'}</strong>
          </div>
          <div>
            <span>Cerrado:</span> <strong>{ticket?.fechaCierre || 'Recientemente'}</strong>
          </div>
        </div>

        <div className="edition-notice">
          Puedes editar tu respuesta hasta 7 días después de enviarla.
        </div>
      </div>
    </div>
  )
}
