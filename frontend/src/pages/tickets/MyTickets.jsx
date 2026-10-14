import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, SelectInput } from "../../shared/components";
import { ROUTES, usuarioTicketDetallePath } from "../../routes/routePaths";
import './MyTickets.css';

export const MyTickets = () => {
    const navigate = useNavigate();

    // 1. Cargar tickets de localStorage
    const [tickets] = useState(() => {
        const guardados = JSON.parse(localStorage.getItem('tickets')) || [];
        return guardados;
    });

    // 2. Estados para TODOS los filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('en curso'); // Por defecto como en la imagen
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 8;

    // 3. Conteo de resumen
    const totalTickets = tickets.length;
    const ticketsEnCursoCount = useMemo(() => {
        return tickets.filter(t => {
            const estado = t.estado || 'Abierto';
            return estado === 'Abierto' || estado === 'En atención' || estado === 'En espera';
        }).length;
    }, [tickets]);

    // Función auxiliar para convertir fecha de DD/MM/YYYY a un valor comparable
    const parseFecha = (fechaStr) => {
        if (!fechaStr) return 0;
        const partes = fechaStr.split(/[/,-]/); // Soporta 12/10/2026 o 12-10-2026
        if (partes.length >= 3) {
            // asume formato DD/MM/YYYY
            return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`).getTime();
        }
        return 0;
    };

    // 4. Lógica Maestra de Filtrado
    const ticketsFiltrados = useMemo(() => {
        return tickets.filter(ticket => {
            const codigo = ticket.codigo || '';
            const asunto = ticket.asunto || '';
            const ambiente = ticket.ambiente || '';
            const estado = ticket.estado || 'Abierto';
            const fechaStr = ticket.fechaCreacion ? ticket.fechaCreacion.split(',')[0] : (ticket.fecha || '');
            
            // A. Filtro de Búsqueda de texto
            const coincideBusqueda =
                codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
                ambiente.toLowerCase().includes(busqueda.toLowerCase());

            // B. Filtro de Estado
            let coincideEstado = true;
            if (filtroEstado === 'en curso') {
                coincideEstado = (estado === 'Abierto' || estado === 'En atención' || estado === 'En espera');
            } else if (filtroEstado !== '') {
                coincideEstado = estado.toLowerCase() === filtroEstado.toLowerCase();
            }

            // C. Filtro de Categoría
            const coincideCategoria = filtroCategoria
                ? ticket.categoria === filtroCategoria || ticket.categoriaNombre === filtroCategoria
                : true;

            // D. Filtro de Fechas
            let coincideFecha = true;
            const tiempoTicket = parseFecha(fechaStr);
            
            if (tiempoTicket > 0) {
                if (fechaInicio) {
                    const tiempoInicio = new Date(`${fechaInicio}T00:00:00`).getTime();
                    if (tiempoTicket < tiempoInicio) coincideFecha = false;
                }
                if (fechaFin) {
                    const tiempoFin = new Date(`${fechaFin}T23:59:59`).getTime();
                    if (tiempoTicket > tiempoFin) coincideFecha = false;
                }
            }

            return coincideBusqueda && coincideEstado && coincideCategoria && coincideFecha;
        });
    }, [tickets, busqueda, filtroEstado, filtroCategoria, fechaInicio, fechaFin]);

    // 5. Paginación
    const totalPaginas = Math.ceil(ticketsFiltrados.length / registrosPorPagina) || 1;
    const ticketsPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * registrosPorPagina;
        return ticketsFiltrados.slice(inicio, inicio + registrosPorPagina);
    }, [ticketsFiltrados, paginaActual]);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('');
        setFiltroCategoria('');
        setFechaInicio('');
        setFechaFin('');
        setPaginaActual(1);
    };

    const irANuevoTicket = () => {
        if (ROUTES?.usuarioNuevoTicket) {
            navigate(ROUTES.usuarioNuevoTicket);
        } else {
            navigate('/usuario/tickets/nuevo');
        }
    };

    const irADetalle = (ticketId) => {
        if (ROUTES?.usuarioTicketDetalle) {
            try {
                navigate(usuarioTicketDetallePath(ticketId));
            } catch(e) {
                navigate(`/usuario/tickets/${ticketId}`);
            }
        } else {
            navigate(`/usuario/tickets/${ticketId}`);
        }
    };

    return (
        <div className="my-tickets-container">
            <div className="my-tickets-header">
                <div>
                    <h1 className="page-title">Mis tickets</h1>
                    <p className="page-subtitle">
                        {totalTickets} tickets registrados · {ticketsEnCursoCount} en curso
                    </p>
                </div>
                <Button variant="primary" onClick={irANuevoTicket}>
                    Registrar un ticket
                </Button>
            </div>

            {/* Barra de Filtros */}
            <div className="filters-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-box">
                    <TextInput
                        placeholder="Buscar ticket..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {/* Filtro de Estado  */}
                <div className="category-select-wrapper">
                    <SelectInput
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        options={[
                            { value: '', label: 'Estado: todos' },
                            { value: 'en curso', label: 'Estado: en curso' },
                            { value: 'abierto', label: 'Abierto' },
                            { value: 'en atención', label: 'En atención' },
                            { value: 'resuelto', label: 'Resuelto' },
                            { value: 'cerrado', label: 'Cerrado' }
                        ]}
                    />
                </div>

                {/* Filtro de Fecha  */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={(e) => setFechaInicio(e.target.value)} 
                        style={{ border: 'none', outline: 'none', color: '#555' }}
                        title="Fecha Desde"
                    />
                    <span style={{ color: '#aaa' }}>–</span>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={(e) => setFechaFin(e.target.value)} 
                        style={{ border: 'none', outline: 'none', color: '#555' }}
                        title="Fecha Hasta"
                    />
                </div>

                {/* Filtro de Categoría */}
                <div className="category-select-wrapper">
                    <SelectInput
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        options={[
                            { value: '', label: 'Categoría: todas' },
                            { value: 'audiovisuales', label: 'Audiovisuales' },
                            { value: 'redes y conectividad', label: 'Redes y conectividad' },
                            { value: 'climatizacion', label: 'Climatización' },
                            { value: 'electrico', label: 'Eléctrico' },
                            { value: 'mobiliario', label: 'Mobiliario' }
                        ]}
                    />
                </div>

                <button type="button" className="btn-clean-filters" onClick={limpiarFiltros}>
                    Limpiar filtros
                </button>
            </div>

            {/* Tabla Principal */}
            <div className="table-card">
                <table className="tickets-table">
                    <thead>
                        <tr>
                            <th>CÓDIGO</th>
                            <th>ASUNTO</th>
                            <th>CATEGORÍA</th>
                            <th>AMBIENTE</th>
                            <th>REGISTRADO</th>
                            <th>PRIORIDAD</th>
                            <th>ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ticketsPaginados.length > 0 ? (
                            ticketsPaginados.map((ticket) => (
                                <tr key={ticket.id || ticket.codigo}>
                                    <td className="code-cell">
                                        <button
                                            type="button"
                                            className="btn-link-code"
                                            onClick={() => irADetalle(ticket.id || ticket.codigo)}
                                        >
                                            {ticket.codigo}
                                        </button>
                                    </td>
                                    <td className="subject-cell">{ticket.asunto || 'Sin asunto'}</td>
                                    <td className="category-cell">
                                        {ticket.categoriaNombre || ticket.categoria || 'General'}
                                    </td>
                                    <td className="location-cell">{ticket.ambiente || '-'}</td>
                                    <td className="date-cell">
                                        {ticket.fechaCreacion 
                                            ? ticket.fechaCreacion.split(',')[0] 
                                            : (ticket.fecha || 'Reciente')}
                                    </td>
                                    <td>
                                        <span className={`priority-tag ${ticket.prioridad?.toLowerCase() || 'baja'}`}>
                                            {ticket.prioridad || 'Baja'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-tag ${ticket.estado?.toLowerCase().replace(' ', '-') || 'abierto'}`}>
                                            {ticket.estado || 'Abierto'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="empty-table-msg">
                                    No se encontraron tickets con los filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Paginación Inferior */}
                <div className="table-pagination">
                    <span className="pagination-info">
                        Mostrando {ticketsFiltrados.length > 0 ? (paginaActual - 1) * registrosPorPagina + 1 : 0}–
                        {Math.min(paginaActual * registrosPorPagina, ticketsFiltrados.length)} de {ticketsFiltrados.length} tickets
                    </span>

                    <div className="pagination-buttons">
                        <button
                            type="button"
                            className="btn-page"
                            disabled={paginaActual === 1}
                            onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                        >
                            Anterior
                        </button>

                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numPage) => (
                            <button
                                key={numPage}
                                type="button"
                                className={`btn-page ${paginaActual === numPage ? 'active' : ''}`}
                                onClick={() => setPaginaActual(numPage)}
                            >
                                {numPage}
                            </button>
                        ))}

                        <button
                            type="button"
                            className="btn-page"
                            disabled={paginaActual === totalPaginas}
                            onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};