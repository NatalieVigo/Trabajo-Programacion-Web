import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Alert, SelectInput, TextInput, Button } from "../../shared/components";
import { TicketConfirmation } from "./TicketConfirmation";
import { listarDisponibles } from "../../services/categorias.service.js";
import { listarAmbientes } from "../../services/catalogo.service.js";
import { crearTicket, existeTicketEnCurso } from "../../services/tickets.service.js";
import { ServiceError } from "../../services/ServiceError.js";
import { PRIORIDAD_LABELS } from "../../utils/format.js";
import { useAuth } from "../../hooks/useAuth.js";
import './NewTicket.css';

const normalizarClaseCSS = (prioridadStr) => {
    return (prioridadStr || 'alta')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export const NewTicket = () => {
    const navigate = useNavigate();
    const { usuario } = useAuth();

    const [categorias, setCategorias] = useState([]);
    const [ambientes, setAmbientes] = useState([]);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
    const [errorCatalogos, setErrorCatalogos] = useState('');
    const [errorRegistro, setErrorRegistro] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [datosTicket, setDatosTicket] = useState({
        categoriaId: '',
        subcategoriaId: '',
        ambienteId: '',
        asunto: '',
        descripcion: ''
    });

    const [duplicado, setDuplicado] = useState(false);
    const [ticketCreado, setTicketCreado] = useState(null);

    useEffect(() => {
        let activo = true;

        // Categorías y ambientes vienen del catálogo (HU-2): solo lo activo admite tickets nuevos.
        Promise.all([listarDisponibles(), listarAmbientes()])
            .then(([categoriasDisponibles, ambientesDelCatalogo]) => {
                if (!activo) return;
                setCategorias(categoriasDisponibles);
                setAmbientes(ambientesDelCatalogo);

                const primeraCategoria = categoriasDisponibles[0];
                const habitual = ambientesDelCatalogo.find(({ id }) => id === usuario?.ambienteHabitualId);
                setDatosTicket((actual) => ({
                    ...actual,
                    categoriaId: primeraCategoria?.id ?? '',
                    subcategoriaId: primeraCategoria?.subcategorias[0]?.id ?? '',
                    ambienteId: habitual?.id ?? '',
                }));
            })
            .catch((error) => {
                if (activo) setErrorCatalogos(error.message || 'No se pudo cargar el catálogo para registrar el ticket.');
            })
            .finally(() => {
                if (activo) setCargandoCatalogos(false);
            });

        return () => { activo = false; };
    }, [usuario?.ambienteHabitualId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'ambienteId' || name === 'categoriaId') setDuplicado(false);
        if (name === 'categoriaId') {
            const categoriaSeleccionada = categorias.find((categoria) => categoria.id === value);
            setDatosTicket((actual) => ({
                ...actual,
                categoriaId: value,
                subcategoriaId: categoriaSeleccionada?.subcategorias[0]?.id ?? '',
            }));
        } else {
            setDatosTicket((actual) => ({ ...actual, [name]: value }));
        }
    };

    const categoriaActual = categorias.find((categoria) => categoria.id === datosTicket.categoriaId);
    const subcategorias = categoriaActual?.subcategorias ?? [];
    const subcategoriaActual = subcategorias.find((subcategoria) => subcategoria.id === datosTicket.subcategoriaId);

    const ambienteActual = ambientes.find((ambiente) => ambiente.id === datosTicket.ambienteId);

    // Aviso de duplicado (HU-3): ya hay un ticket en curso en el mismo ambiente y la misma categoría.
    const { ambienteId, categoriaId } = datosTicket;
    useEffect(() => {
        if (!ambienteId || !categoriaId) return undefined;

        let activo = true;
        existeTicketEnCurso({ ambienteId, categoriaId })
            .then((hayDuplicado) => {
                if (activo) setDuplicado(hayDuplicado);
            })
            .catch((error) => {
                if (activo) setErrorRegistro(error.message || 'No se pudo verificar si ya existe un ticket en el aula.');
            });

        return () => { activo = false; };
    }, [ambienteId, categoriaId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setGuardando(true);
        setErrorRegistro('');
        try {
            const ticket = await crearTicket(datosTicket, usuario?.id);
            setTicketCreado(ticket);
        } catch (error) {
            const detalleError = error instanceof ServiceError
                ? Object.values(error.fieldErrors ?? {}).join(' ')
                : '';
            setErrorRegistro(
                error instanceof ServiceError
                    ? [error.message, detalleError].filter(Boolean).join(' ')
                    : 'No se pudo registrar el ticket.',
            );
        } finally {
            setGuardando(false);
        }
    };

    if (ticketCreado) {
        return <TicketConfirmation ticket={ticketCreado} />;
    }

    if (cargandoCatalogos) {
        return (
            <div className="new-ticket-container" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Cargando categorías...</p>
            </div>
        );
    }

    return (
        <div className="new-ticket-container">
            <PageHeader
                title="Nuevo ticket"
                description="Indica qué falla y dónde. La prioridad se sugiere según la categoría y el supervisor puede ajustarla."
            />

            {errorCatalogos && <Alert variant="error">{errorCatalogos}</Alert>}
            {errorRegistro && <Alert variant="error">{errorRegistro}</Alert>}

            {!errorCatalogos && categorias.length === 0 && (
                <Alert variant="warning">No hay categorías disponibles para registrar un ticket.</Alert>
            )}

            {duplicado && ambienteActual && categoriaActual && (
                <Alert variant="warning">
                    Ya existe un ticket de <strong>{categoriaActual.nombre}</strong> en curso para el aula{' '}
                    <strong>{ambienteActual.codigo}</strong>. Revísalo antes de registrar otro. Puedes continuar si se
                    trata de otro incidente.
                </Alert>
            )}

            <div className="new-ticket-grid">
                <div className="main-form-card">
                    <form className="ticket-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="input-group">
                                <label htmlFor="categoriaId">CATEGORÍA</label>
                                <SelectInput
                                    id="categoriaId"
                                    name="categoriaId"
                                    value={datosTicket.categoriaId}
                                    onChange={handleChange}
                                    required
                                    options={categorias.map(({ id, nombre }) => ({ value: id, label: nombre }))}
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="subcategoriaId">SUBCATEGORÍA</label>
                                <SelectInput
                                    id="subcategoriaId"
                                    name="subcategoriaId"
                                    value={datosTicket.subcategoriaId}
                                    onChange={handleChange}
                                    required
                                    options={subcategorias.map(({ id, nombre }) => ({ value: id, label: nombre }))}
                                />
                                <span className="field-help-text">Depende de la categoría elegida.</span>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="input-group">
                                <label htmlFor="ambienteId">AULA O AMBIENTE</label>
                                <SelectInput
                                    id="ambienteId"
                                    name="ambienteId"
                                    value={datosTicket.ambienteId}
                                    onChange={handleChange}
                                    required
                                    placeholder="Selecciona el aula o ambiente"
                                    options={ambientes.map(({ id, codigo, nombre }) => ({ value: id, label: `${codigo} · ${nombre}` }))}
                                />
                                <span className="field-help-text">
                                    El lugar donde ocurre la falla, tal como aparece en la puerta.
                                </span>
                            </div>

                            <div className="input-group">
                                <label>PRIORIDAD SUGERIDA</label>
                                <div className="priority-badge-box">
                                    <span className={`priority-tag ${normalizarClaseCSS(subcategoriaActual?.prioridadPorDefecto)}`}>
                                        {PRIORIDAD_LABELS[subcategoriaActual?.prioridadPorDefecto] || '—'}
                                    </span>
                                    <span className="priority-label-text">Sugerida por la subcategoría</span>
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="asunto">ASUNTO</label>
                            <TextInput
                                id="asunto"
                                name="asunto"
                                value={datosTicket.asunto}
                                onChange={handleChange}
                                placeholder="Resumen breve del problema"
                                maxLength={120}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="descripcion">DESCRIPCIÓN</label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                className="text-area-input"
                                value={datosTicket.descripcion}
                                onChange={handleChange}
                                rows={4}
                                maxLength={600}
                                required
                                placeholder="El proyector enciende el foco pero la imagen no llega a la pantalla..."
                            />
                            <div className="field-help-row">
                                <span>Indica qué probaste y desde cuándo ocurre.</span>
                                <span>{datosTicket.descripcion.length} / 600</span>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>EVIDENCIA (OPCIONAL)</label>
                            <div className="file-dropzone">
                                <span>Arrastra una foto o pulsa para elegir · JPG o PNG hasta 5 MB</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <Button type="submit" variant="primary" disabled={guardando || Boolean(errorCatalogos) || categorias.length === 0}>
                                {guardando ? 'Registrando…' : 'Registrar ticket'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
                        </div>

                    </form>
                </div>

                <aside className="info-sidebar">
                    <div className="info-card">
                        <h3>Qué conviene incluir</h3>
                        <ul className="info-list">
                            <li>El aula o ambiente tal como aparece en la puerta.</li>
                            <li>Desde cuándo ocurre la falla y si es intermitente.</li>
                            <li>Qué ya intentaste (cambiar cable, reiniciar equipo).</li>
                            <li>Si hay clase o evento en las próximas horas.</li>
                            <li>Un teléfono de contacto si hay que coordinar el acceso.</li>
                        </ul>
                    </div>

                    <div className="info-card time-card">
                        <h4>Tiempo esperado para esta categoría</h4>
                        <p>
                            Prioridad {PRIORIDAD_LABELS[subcategoriaActual?.prioridadPorDefecto] || '—'}: atención dentro de{' '}
                            <strong>{subcategoriaActual?.tiempoEsperadoHoras ?? categoriaActual?.tiempoEsperadoHoras ?? '—'} h</strong> desde el registro.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};