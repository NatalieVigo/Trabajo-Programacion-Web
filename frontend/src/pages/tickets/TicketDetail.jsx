import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components";
import { ROUTES } from "../../routes/routePaths";
import { sessionRepository } from "../../repositories/session.repository.js";
import './TicketDetail.css';

export const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [bitacora, setBitacora] = useState([]);
    const [error, setError] = useState(false);
    
    const [nombreUsuario, setNombreUsuario] = useState('Camila Quispe Ramos');
    const [inicialesUsuario, setInicialesUsuario] = useState('CQ');

    // Cargar la sesion del usuario y buscar el ticket en el local storage
    useEffect(() => {
        // Sacar datos del usuario que inicio sesion
        const sesion = sessionRepository.read();
        if (sesion?.nombre) {
            setNombreUsuario(sesion.nombre);
            const inits = sesion.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            setInicialesUsuario(inits || 'CQ');
        }

        // Jalamos la BD de tickets
        const dbString = localStorage.getItem('mesa-ayuda:db');
        if (!dbString) {
            setError(true);
            return;
        }

        const db = JSON.parse(dbString);
        const ticketsGuardados = db.tickets || [];

        // Buscar si coincide por el ID o por el codigo
        const ticketEncontrado = ticketsGuardados.find(t =>
            t && (t.id?.toString() === id || t.codigo === id)
        );

        if (ticketEncontrado) {
            setTicket(ticketEncontrado);

            // Cargar los comentarios de la bitacora filtrando las notas internas del tecnico
            let listaComentarios = [];

            if (Array.isArray(ticketEncontrado.bitacora) && ticketEncontrado.bitacora.length > 0) {
                listaComentarios = ticketEncontrado.bitacora.filter(
                    item => !item.esInterna && !item.esInterno && item.tipo !== 'nota_interna'
                );
            } else if (Array.isArray(ticketEncontrado.comentarios) && ticketEncontrado.comentarios.length > 0) {
                listaComentarios = ticketEncontrado.comentarios.filter(
                    item => !item.esInterna && !item.esInterno && item.tipo !== 'nota_interna'
                );
            } else {
                // Si recien se crea y no hay bitacora, mostramos la descripcion inicial
                const fechaReg = ticketEncontrado.fechaCreacion || ticketEncontrado.creadoEn || ticketEncontrado.fecha || new Date().toLocaleString();
                listaComentarios = [
                    {
                        id: `bit-${Date.now()}`,
                        autor: sesion?.nombre || 'Camila Quispe Ramos',
                        rol: 'Usuario',
                        iniciales: sesion?.nombre ? sesion.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CQ',
                        fecha: fechaReg,
                        texto: ticketEncontrado.descripcion || ticketEncontrado.asunto || 'Reporte inicial registrado.'
                    }
                ];
            }

            setBitacora(listaComentarios);
        } else {
            setError(true);
        }
    }, [id]);

    // Agregar un nuevo comentario público
    const handleEnviarComentario = (e) => {
        e.preventDefault();
        if (!nuevoComentario.trim() || !ticket) return;

        const nuevaEntrada = {
            id: `bit-${Date.now()}`,
            autor: nombreUsuario,
            rol: 'Usuario',
            iniciales: inicialesUsuario,
            fecha: new Date().toLocaleString('es-PE'),
            texto: nuevoComentario.trim(),
            esInterna: false
        };

        const bitacoraActualizada = [...bitacora, nuevaEntrada];
        setBitacora(bitacoraActualizada);

        // Guardar el comentario en el local storage
        try {
            const dbString = localStorage.getItem('mesa-ayuda:db');
            if (dbString) {
                const db = JSON.parse(dbString);
                const index = db.tickets.findIndex(t => t.id?.toString() === ticket.id?.toString() || t.codigo === ticket.codigo);
                if (index !== -1) {
                    db.tickets[index].bitacora = db.tickets[index].bitacora 
                        ? [...db.tickets[index].bitacora, nuevaEntrada]
                        : bitacoraActualizada;
                    localStorage.setItem('mesa-ayuda:db', JSON.stringify(db));
                }
            }
        } catch (err) {
            console.error("Error guardando comentario:", err);
        }

        setNuevoComentario('');
    };

    const handleVolver = () => {
        if (ROUTES?.usuarioTickets) {
            navigate(ROUTES.usuarioTickets);
        } else {
            navigate('/usuario/tickets');
        }
    };

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
    const prioridadClase = prioridadSegura.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const fechaMostrar = ticket.fechaCreacion || ticket.creadoEn || ticket.fecha || '-';
    const fechaLimpia = String(fechaMostrar).split(',')[0];

    // Verificar en que estado esta para marcar los hitos de la linea de tiempo
    const estadoLower = estadoSeguro.toLowerCase();
    const tieneTecnico = !!(ticket.tecnicoAsignado || ticket.tecnicoNombre || ticket.asignadoA);
    
    const pasoAsignado = tieneTecnico || estadoLower === 'en atención' || estadoLower === 'en espera' || estadoLower === 'resuelto' || estadoLower === 'cerrado';
    const pasoAtencion = estadoLower === 'en atención' || estadoLower === 'resuelto' || estadoLower === 'cerrado';
    const pasoResuelto = estadoLower === 'resuelto' || estadoLower === 'cerrado';

    const tecnicoNombre = ticket.tecnicoNombre || ticket.tecnicoAsignado || (pasoAsignado ? 'Técnico de soporte' : 'Pendiente');
    const supervisorNombre = ticket.supervisorNombre || 'Lucía Mendoza Ríos';

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

                <p className="ticket-subtitle">{ticket.asunto || ticket.descripcion}</p>
            </div>

            <div className="ticket-detail-grid">
                
                {/* Comentarios y bitacora */}
                <div className="bitacora-card">
                    <h2>Bitácora de la atención</h2>
                    <div className="comments-list">
                        {bitacora.map((item) => (
                            <div key={item.id || Math.random()} className="comment-item">
                                <div className={`avatar-badge ${(item.rol || 'usuario').toLowerCase()}`}>
                                    {item.iniciales || 'TU'}
                                </div>
                                <div className="comment-content">
                                    <div className="comment-meta">
                                        <strong>{item.autor || 'Usuario'}</strong>
                                        <span className="role-label">{item.rol || 'Usuario'}</span>
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

                {/* Lateral con resumen del ticket y linea de tiempo */}
                <aside className="detail-sidebar">
                    <div className="sidebar-card">
                        <h3>Datos del reporte</h3>
                        <div className="report-data-list">
                            <div className="data-row">
                                <span className="data-label">Categoría</span>
                                <span className="data-value">{ticket.categoriaNombre || ticket.categoria || 'General'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Subcategoría</span>
                                <span className="data-value">{ticket.subcategoriaNombre || ticket.subcategoria || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Ambiente</span>
                                <span className="data-value highlight">{ticket.ambiente || ticket.ambienteCodigo || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Registrado</span>
                                <span className="data-value">{fechaLimpia}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Técnico asignado</span>
                                <span className="data-value">{tecnicoNombre}</span>
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
                                    <span>{fechaLimpia} · registrado por ti</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAsignado ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Asignado</strong>
                                    <span>{pasoAsignado ? `${supervisorNombre} asignó el caso` : 'Pendiente'}</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAtencion ? 'in-progress' : pasoResuelto ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>En atención</strong>
                                    <span>{pasoAtencion || pasoResuelto ? `${tecnicoNombre} trabajando` : 'Pendiente'}</span>
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