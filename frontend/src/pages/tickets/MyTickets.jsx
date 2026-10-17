import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, PageHeader, PriorityBadge, SelectInput, StatusBadge, TextInput } from "../../shared/components";
import { ROUTES, usuarioTicketDetallePath } from "../../routes/routePaths";
import { ticketsRepository } from "../../repositories/tickets.repository.js";
import { ambientesRepository, categoriasRepository, subcategoriasRepository } from "../../repositories/catalogo.repository.js";
import { formatDate } from "../../utils/format.js";
import { esTicketEnCurso } from "../../services/ticketsEnCurso.js";
import { useAuth } from "../../hooks/useAuth.js";
import Paginacion from "../catalogo/Paginacion.jsx";
import './MyTickets.css';

export const MyTickets = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { usuario } = useAuth();

    const [tickets] = useState(() => {
        return usuario?.id ? ticketsRepository.findAll({ usuarioId: usuario.id }) : [];
    });

    const opcionesCategorias = [
        { value: '', label: 'Categoría: todas' },
        ...categoriasRepository.findAll().map(({ id, nombre }) => ({ value: id, label: nombre })),
    ];

    // Inputs para controlar la busqueda y los combos
    const [busqueda, setBusqueda] = useState('');
    const codigoBuscado = searchParams.get('codigo')?.trim() || '';
    const busquedaActual = codigoBuscado || busqueda;
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 8;

    const totalTickets = tickets.length;
    const ticketsEnCursoCount = useMemo(() => tickets.filter(esTicketEnCurso).length, [tickets]);

    const obtenerCategoriaTexto = (t) => {
        const categoria = categoriasRepository.findById(t.categoriaId);
        const subcategoria = subcategoriasRepository.findById(t.subcategoriaId);
        return [categoria?.nombre || t.categoriaNombre || t.categoria, subcategoria?.nombre || t.subcategoriaNombre]
            .filter(Boolean)
            .join(' · ') || 'General';
    };

    const obtenerAmbienteTexto = (t) => {
        const ambiente = ambientesRepository.findById(t.ambienteId);
        return ambiente?.codigo || t.ambienteCodigo || t.ambiente || '-';
    };

    const obtenerFechaTexto = (t) => {
        const f = t.creadoEn || t.fechaCreacion || t.fecha || t.registrado;
        return f ? formatDate(f) || String(f).split(',')[0] : 'Reciente';
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

    const ticketsFiltrados = useMemo(() => {
        return tickets.filter(ticket => {
            const codigo = ticket.codigo || '';
            const asunto = ticket.asunto || ticket.descripcion || '';
            const ambiente = obtenerAmbienteTexto(ticket);
            const estado = String(ticket.estado || 'abierto').toLowerCase().replaceAll(' ', '_');
            
            // Texto libre
            const coincideBusqueda =
                codigo.toLowerCase().includes(busquedaActual.toLowerCase()) ||
                asunto.toLowerCase().includes(busquedaActual.toLowerCase()) ||
                ambiente.toLowerCase().includes(busquedaActual.toLowerCase());

            // Estado del ticket
            let coincideEstado = true;
            if (filtroEstado === 'en_curso') {
                coincideEstado = esTicketEnCurso(ticket);
            } else if (filtroEstado !== '') {
                coincideEstado = estado === filtroEstado;
            }

            // Categoria principal o ID
            let coincideCategoria = true;
            if (filtroCategoria !== '') {
                const catFiltroLower = filtroCategoria.toLowerCase().trim();
                const catNombreVal = obtenerCategoriaTexto(ticket).toLowerCase().trim();
                coincideCategoria = ticket.categoriaId === filtroCategoria || catNombreVal.includes(catFiltroLower);
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
    }, [tickets, busquedaActual, filtroEstado, filtroCategoria, fechaInicio, fechaFin]);

    const totalPaginas = Math.ceil(ticketsFiltrados.length / registrosPorPagina) || 1;
    const paginaVisible = Math.min(paginaActual, totalPaginas);
    const ticketsPaginados = useMemo(() => {
        const inicio = (paginaVisible - 1) * registrosPorPagina;
        return ticketsFiltrados.slice(inicio, inicio + registrosPorPagina);
    }, [ticketsFiltrados, paginaVisible]);

    const actualizarFiltro = (setter) => (event) => {
        setter(event.target.value);
        setPaginaActual(1);
    };

    const actualizarBusqueda = (event) => {
        setBusqueda(event.target.value);
        setPaginaActual(1);
        if (searchParams.has('codigo')) {
            const siguientesParametros = new URLSearchParams(searchParams);
            siguientesParametros.delete('codigo');
            setSearchParams(siguientesParametros, { replace: true });
        }
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('');
        setFiltroCategoria('');
        setFechaInicio('');
        setFechaFin('');
        setPaginaActual(1);
        if (searchParams.has('codigo')) {
            const siguientesParametros = new URLSearchParams(searchParams);
            siguientesParametros.delete('codigo');
            setSearchParams(siguientesParametros, { replace: true });
        }
    };

    const irANuevoTicket = () => {
        if (ROUTES?.usuarioNuevoTicket) {
            navigate(ROUTES.usuarioNuevoTicket);
        } else {
            navigate('/usuario/tickets/nuevo');
        }
    };

    const irADetalle = (ticketId) => {
        navigate(usuarioTicketDetallePath(ticketId));
    };

    const primeroVisible = ticketsFiltrados.length > 0 ? (paginaVisible - 1) * registrosPorPagina + 1 : 0;
    const ultimoVisible = Math.min(paginaVisible * registrosPorPagina, ticketsFiltrados.length);

    return (
        <div className="mis-tickets">
            <PageHeader
                title="Mis tickets"
                subtitle={`${totalTickets} tickets registrados · ${ticketsEnCursoCount} en curso`}
                actions={<Button onClick={irANuevoTicket}>Registrar un ticket</Button>}
            />

            {codigoBuscado && (
                <Alert variant="info" className="mis-tickets__aviso">
                    Buscaste el código <code>{codigoBuscado}</code>; estos son tus resultados.
                </Alert>
            )}

            {/* Filtros superiores */}
            <div className="mis-tickets__filtros">
                <div className="mis-tickets__busqueda">
                    <TextInput
                        placeholder="TCK-2026-…"
                        aria-label="Buscar por código, asunto o ambiente"
                        value={busquedaActual}
                        onChange={actualizarBusqueda}
                    />
                </div>

                {/* Combo estado */}
                <div className="mis-tickets__filtro">
                    <SelectInput
                        aria-label="Estado"
                        value={filtroEstado}
                        onChange={actualizarFiltro(setFiltroEstado)}
                        options={[
                            { value: '', label: 'Estado: todos' },
                            { value: 'en_curso', label: 'Estado: en curso' },
                            { value: 'abierto', label: 'Abierto' },
                            { value: 'en_atencion', label: 'En atención' },
                            { value: 'en_espera', label: 'En espera' },
                            { value: 'reabierto', label: 'Reabierto' },
                            { value: 'resuelto', label: 'Resuelto' },
                            { value: 'cerrado', label: 'Cerrado' },
                            { value: 'cancelado', label: 'Cancelado' }
                        ]}
                    />
                </div>

                {/* Rango de fechas */}
                <div className="mis-tickets__fechas" role="group" aria-label="Registrado entre">
                    <TextInput
                        type="date"
                        aria-label="Desde"
                        value={fechaInicio}
                        onChange={actualizarFiltro(setFechaInicio)}
                    />
                    <span className="mis-tickets__guion" aria-hidden="true">–</span>
                    <TextInput
                        type="date"
                        aria-label="Hasta"
                        value={fechaFin}
                        onChange={actualizarFiltro(setFechaFin)}
                    />
                </div>

                {/* Combo categorias */}
                <div className="mis-tickets__filtro">
                    <SelectInput
                        aria-label="Categoría"
                        value={filtroCategoria}
                        onChange={actualizarFiltro(setFiltroCategoria)}
                        options={opcionesCategorias}
                    />
                </div>

                <Button variant="tertiary" size="sm" onClick={limpiarFiltros}>
                    Limpiar filtros
                </Button>
            </div>

            {/* Tabla de tickets */}
            <div className="mis-tickets__tabla">
                <table>
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
                                    <td>
                                        <button
                                            type="button"
                                            className="mis-tickets__codigo"
                                            onClick={() => irADetalle(ticket.id || ticket.codigo)}
                                        >
                                            {ticket.codigo}
                                        </button>
                                    </td>
                                    <td className="mis-tickets__asunto">{ticket.asunto || ticket.descripcion || 'Sin asunto'}</td>
                                    <td className="mis-tickets__secundario">
                                        {obtenerCategoriaTexto(ticket)}
                                    </td>
                                    <td className="mis-tickets__ambiente">
                                        {obtenerAmbienteTexto(ticket)}
                                    </td>
                                    <td className="mis-tickets__secundario">
                                        {obtenerFechaTexto(ticket)}
                                    </td>
                                    <td>
                                        <PriorityBadge prioridad={ticket.prioridad} />
                                    </td>
                                    <td>
                                        <StatusBadge estado={ticket.estado || 'abierto'} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="mis-tickets__vacio">
                                    No se encontraron tickets con los filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Conteo y paginación */}
            <div className="mis-tickets__pie">
                <p className="mis-tickets__conteo">
                    Mostrando {primeroVisible}–{ultimoVisible} de {ticketsFiltrados.length} tickets
                </p>
                <Paginacion
                    pagina={paginaVisible}
                    totalPaginas={totalPaginas}
                    onCambiar={setPaginaActual}
                    etiqueta="Páginas de mis tickets"
                />
            </div>
        </div>
    );
};
