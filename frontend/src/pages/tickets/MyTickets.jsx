import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, SelectInput } from "../../shared/components";
import { ROUTES, usuarioTicketDetallePath } from "../../routes/routePaths";
import { ticketsRepository } from "../../repositories/tickets.repository.js";
import { sessionRepository } from "../../repositories/session.repository.js";
import { listar as listarCategorias } from "../../services/categorias.service.js";
import './MyTickets.css';

export const MyTickets = () => {
    const navigate = useNavigate();

    // Sacamos los tickets del usuario logueado en la sesion
    const [tickets] = useState(() => {
        const sesion = sessionRepository.read();
        
        if (!sesion || !sesion.usuarioId) {
            return [];
        }
        
        return ticketsRepository.findAll({ usuarioId: sesion.usuarioId });
    });

    // Mapeos de IDs a nombres para no mostrar cat-01 o amb-01 pelado
    const [opcionesCategorias, setOpcionesCategorias] = useState([
        { value: '', label: 'Categoría: todas' }
    ]);
    const [mapaCategorias, setMapaCategorias] = useState({});
    const [mapaAmbientes, setMapaAmbientes] = useState({});

    useEffect(() => {
        // Cargar categorias desde el servicio para los combos
        listarCategorias()
            .then((listaCat) => {
                if (!Array.isArray(listaCat)) return;

                const mapaCat = {};
                const opts = [{ value: '', label: 'Categoría: todas' }];

                listaCat.forEach(cat => {
                    const nombre = cat.nombre || cat.label;
                    const val = cat.id || cat.value || nombre.toLowerCase();
                    
                    if (cat.id) mapaCat[cat.id] = nombre;

                    if (!cat.categoriaPadreId && !cat.categoriaId && !cat.parentId) {
                        if (!opts.some(o => o.label.toLowerCase() === nombre.toLowerCase())) {
                            opts.push({ value: val, label: nombre });
                        }
                    }
                });

                setMapaCategorias(mapaCat);
                setOpcionesCategorias(opts);
            })
            .catch(err => console.error("Error al cargar categorias:", err));

        // Leer los ambientes guardados en el local storage
        try {
            const dbString = localStorage.getItem('mesa-ayuda:db');
            if (dbString) {
                const db = JSON.parse(dbString);
                if (Array.isArray(db.ambientes)) {
                    const mapaAmb = {};
                    db.ambientes.forEach(a => {
                        mapaAmb[a.id] = a.codigo || a.nombre || a.id;
                    });
                    setMapaAmbientes(mapaAmb);
                }
            }
        } catch (e) {
            console.error("Error leyendo ambientes:", e);
        }
    }, []);

    // Inputs para controlar la busqueda y los combos
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 8;

    // Conteo para la cabecera
    const totalTickets = tickets.length;
    const ticketsEnCursoCount = useMemo(() => {
        return tickets.filter(t => {
            const estado = (t.estado || 'Abierto').toLowerCase();
            return estado === 'abierto' || estado === 'en atención' || estado === 'en espera';
        }).length;
    }, [tickets]);

    // Formateadores para armar las celdas de la tabla
    const obtenerCategoriaTexto = (t) => {
        if (t.categoriaNombre && t.subcategoriaNombre) {
            return `${t.categoriaNombre} · ${t.subcategoriaNombre}`;
        }
        if (t.categoriaNombre) return t.categoriaNombre;
        
        const catId = t.categoriaId || t.categoria;
        if (mapaCategorias[catId]) return mapaCategorias[catId];
        
        return t.categoria || 'General';
    };

    const obtenerAmbienteTexto = (t) => {
        if (t.ambiente) return t.ambiente;
        if (t.ambienteCodigo) return t.ambienteCodigo;
        if (t.ambienteId && mapaAmbientes[t.ambienteId]) return mapaAmbientes[t.ambienteId];
        if (t.ambienteId) return t.ambienteId;
        return '-';
    };

    const obtenerFechaTexto = (t) => {
        const f = t.creadoEn || t.fechaCreacion || t.fecha || t.registrado;
        if (!f) return 'Reciente';

        if (typeof f === 'string' && (f.includes('T') || f.includes('-'))) {
            const dateObj = new Date(f);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        }
        return String(f).split(',')[0];
    };

    const parseFecha = (t) => {
        const f = t.creadoEn || t.fechaCreacion || t.fecha;
        if (!f) return 0;
        
        const dateObj = new Date(f);
        if (!isNaN(dateObj.getTime())) return dateObj.getTime();

        const partes = String(f).split(/[/,-]/);
        if (partes.length >= 3) {
            return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`).getTime();
        }
        return 0;
    };

    // Aplicar los filtros seleccionados
    const ticketsFiltrados = useMemo(() => {
        return tickets.filter(ticket => {
            const codigo = ticket.codigo || '';
            const asunto = ticket.asunto || ticket.descripcion || '';
            const ambiente = obtenerAmbienteTexto(ticket);
            const estado = ticket.estado || 'Abierto';
            
            // Texto libre
            const coincideBusqueda =
                codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
                ambiente.toLowerCase().includes(busqueda.toLowerCase());

            // Estado del ticket
            let coincideEstado = true;
            const estadoLower = estado.toLowerCase();
            if (filtroEstado === 'en curso') {
                coincideEstado = (estadoLower === 'abierto' || estadoLower === 'en atención' || estadoLower === 'en espera');
            } else if (filtroEstado !== '') {
                coincideEstado = estadoLower === filtroEstado.toLowerCase();
            }

            // Categoria principal o ID
            let coincideCategoria = true;
            if (filtroCategoria !== '') {
                const catFiltroLower = filtroCategoria.toLowerCase().trim();
                const catNombreVal = obtenerCategoriaTexto(ticket).toLowerCase().trim();
                const catIdVal = String(ticket.categoriaId || ticket.categoria || '').toLowerCase().trim();
                
                coincideCategoria = catNombreVal.includes(catFiltroLower) || catIdVal === catFiltroLower;
            }

            // Rango de fechas
            let coincideFecha = true;
            const tiempoTicket = parseFecha(ticket);
            
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
    }, [tickets, busqueda, filtroEstado, filtroCategoria, fechaInicio, fechaFin, mapaCategorias, mapaAmbientes]);

    // Paginacion
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

            {/* Filtros superiores */}
            <div className="filters-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-box">
                    <TextInput
                        placeholder="Buscar ticket..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {/* Combo estado */}
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

                {/* Rango de fechas */}
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

                {/* Combo categorias */}
                <div className="category-select-wrapper">
                    <SelectInput
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        options={opcionesCategorias}
                    />
                </div>

                <button type="button" className="btn-clean-filters" onClick={limpiarFiltros}>
                    Limpiar filtros
                </button>
            </div>

            {/* Tabla de tickets */}
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
                                    <td className="subject-cell">{ticket.asunto || ticket.descripcion || 'Sin asunto'}</td>
                                    <td className="category-cell">
                                        {obtenerCategoriaTexto(ticket)}
                                    </td>
                                    <td className="location-cell">
                                        {obtenerAmbienteTexto(ticket)}
                                    </td>
                                    <td className="date-cell">
                                        {obtenerFechaTexto(ticket)}
                                    </td>
                                    <td>
                                        <span className={`priority-tag ${(ticket.prioridad || 'baja').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
                                            {ticket.prioridad || 'Baja'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-tag ${(ticket.estado || 'abierto').toLowerCase().replace(' ', '-')}`}>
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

                {/* Controles de paginacion */}
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