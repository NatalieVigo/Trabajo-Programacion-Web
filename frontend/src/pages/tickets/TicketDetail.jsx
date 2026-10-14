import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components";
import { ROUTES } from "../../routes/routePaths";
import './TicketDetail.css';

export const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [bitacora, setBitacora] = useState([]);
    const [error, setError] = useState(false);

    // Buscar el ticket en localStorage
    useEffect(() => {
        const ticketsGuardados = JSON.parse(localStorage.getItem('tickets')) || [];
        
        // Buscamos por ID o por Código 
        const ticketEncontrado = ticketsGuardados.find(t => 
            t.id?.toString() === id || t.codigo === id
        );
        
        if (ticketEncontrado) {
            setTicket(ticketEncontrado);
            
            const fechaRegistro = ticketEncontrado.fecha || ticketEncontrado.fechaCreacion || ticketEncontrado.registrado || new Date().toLocaleDateString();
            
            setBitacora([
                {
                    id: Date.now(),
                    autor: 'Tú',
                    rol: 'Usuario',
                    iniciales: 'TU',
                    fecha: fechaRegistro,
                    texto: ticketEncontrado.descripcion || ticketEncontrado.asunto || 'Reporte inicial registrado.'
                }
            ]);
        } else {
            setError(true);
        }
    }, [id]);

    const handleEnviarComentario = (e) => {
        e.preventDefault();
        if (!nuevoComentario.trim()) return;

        const entrada = {
            id: Date.now(),
            autor: 'Tú',
            rol: 'Usuario',
            iniciales: 'TU',
            fecha: new Date().toLocaleString(),
            texto: nuevoComentario.trim()
        };

        setBitacora([...bitacora, entrada]);
        setNuevoComentario('');
    };

    const handleVolver = () => {
        if (ROUTES?.usuarioTickets) {
            navigate(ROUTES.usuarioTickets);
        } else {
            navigate('/usuario/tickets');
        }
    };

    // Mensaje si no encuentra el ticket
    if (error) {
        return (
            <div className="ticket-detail-container" style={{ textAlign: 'center', padding: '50px' }}>
                <h2>No se encontró el ticket</h2>
                <p>El ticket que buscas no existe o ha sido eliminado.</p>
                <Button onClick={handleVolver}>Volver a mis tickets</Button>
            </div>
        );
    }

    
    if (!ticket) return null; 

    
    const estadoSeguro = ticket.estado || 'Abierto';
    const prioridadSegura = ticket.prioridad || 'Baja';
    const estadoClase = estadoSeguro.toLowerCase().replace(' ', '-');
    const prioridadClase = prioridadSegura.toLowerCase();
    const fechaMostrar = ticket.fecha || ticket.fechaCreacion || ticket.registrado || '-';

    // Lógica visual para la línea de tiempo
    const estadoTicket = estadoSeguro.toLowerCase();
    const pasoAsignado = estadoTicket === 'en atención' || estadoTicket === 'resuelto' || estadoTicket === 'cerrado';
    const pasoAtencion = estadoTicket === 'en atención';
    const pasoResuelto = estadoTicket === 'resuelto' || estadoTicket === 'cerrado';

    return (
        <div className="ticket-detail-container">
            <div className="ticket-detail-header">
                <div className="breadcrumb">
                    <span className="breadcrumb-link" onClick={handleVolver}>Mis tickets</span>
                    <span className="breadcrumb-separator">·</span>
                    <span className="breadcrumb-current">{ticket.codigo}</span>
                </div>

                <div className="title-row">
                    <div className="title-with-badges">
                        <h1>{ticket.codigo}</h1>
                        <span className={`priority-tag ${prioridadClase}`}>{prioridadSegura}</span>
                        <span className={`status-tag ${estadoClase}`}>{estadoSeguro}</span>
                    </div>
                    <Button variant="secondary" onClick={() => document.getElementById('comentario-input')?.focus()}>
                        Agregar información
                    </Button>
                </div>

                <p className="ticket-subtitle">{ticket.asunto}</p>
            </div>

            <div className="ticket-detail-grid">
                
                {/* Bitácora */}
                <div className="bitacora-card">
                    <h2>Bitácora de la atención</h2>
                    <div className="comments-list">
                        {bitacora.map((item) => (
                            <div key={item.id} className="comment-item">
                                <div className={`avatar-badge ${item.rol.toLowerCase()}`}>
                                    {item.iniciales}
                                </div>
                                <div className="comment-content">
                                    <div className="comment-meta">
                                        <strong>{item.autor}</strong>
                                        <span className="role-label">{item.rol}</span>
                                        <span className="dot-separator">·</span>
                                        <span className="date-label">{item.fecha}</span>
                                    </div>
                                    <p className="comment-text">{item.texto}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form className="add-comment-form" onSubmit={handleEnviarComentario}>
                        <label htmlFor="comentario-input">AGREGAR INFORMACIÓN</label>
                        <textarea
                            id="comentario-input"
                            rows={3}
                            placeholder="Escribe aquí si tienes un dato nuevo que ayude al técnico..."
                            value={nuevoComentario}
                            onChange={(e) => setNuevoComentario(e.target.value)}
                        />
                        <div className="form-footer-row">
                            <Button type="submit" variant="primary">
                                Enviar comentario
                            </Button>
                            <span className="disclaimer-text">
                                Las notas internas del equipo técnico no se muestran aquí.
                            </span>
                        </div>
                    </form>
                </div>

                {/* Datos del Reporte */}
                <aside className="detail-sidebar">
                    <div className="sidebar-card">
                        <h3>Datos del reporte</h3>
                        <div className="report-data-list">
                            <div className="data-row">
                                <span className="data-label">Categoría</span>
                                <span className="data-value">{ticket.categoriaNombre || ticket.categoria || 'Sin categoría'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Subcategoría</span>
                                <span className="data-value">{ticket.subcategoria || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Ambiente</span>
                                <span className="data-value highlight">{ticket.ambiente || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Registrado</span>
                                <span className="data-value">{String(fechaMostrar).split(',')[0]}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Técnico asignado</span>
                                <span className="data-value">{pasoAsignado ? 'Técnico de soporte' : 'Pendiente'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Atención esperada</span>
                                <span className="data-value">{ticket.tiempoEsperado || 'No especificado'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card">
                        <h3>Línea de tiempo</h3>
                        <div className="timeline-list">
                            <div className="timeline-item done">
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Abierto</strong>
                                    <span>{fechaMostrar} · registrado por ti</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAsignado ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Asignado</strong>
                                    <span>{pasoAsignado ? 'Supervisor asignó el caso' : 'Pendiente'}</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAtencion ? 'in-progress' : pasoResuelto ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>En atención</strong>
                                    <span>{pasoAtencion || pasoResuelto ? 'Técnico trabajando' : 'Pendiente'}</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoResuelto ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Resuelto</strong>
                                    <span>{pasoResuelto ? 'Problema solucionado' : 'Pendiente'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};