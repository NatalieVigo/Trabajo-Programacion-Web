import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Alert, SelectInput, TextInput, Button } from "../../shared/components";
import { TicketConfirmation } from "./TicketConfirmation"; // Importamos el componente 3.2
import './NewTicket.css';

const CONFIG_CATEGORIAS = {
    audiovisuales: {
        label: 'Audiovisuales',
        prioridad: 'Alta',
        tiempo: '8 h hábiles',
        subcategorias: [
            { value: 'proyector', label: 'Proyector no enciende' },
            { value: 'audio', label: 'Sin sonido en parlantes' }
        ]
    },
    redes: {
        label: 'Redes y conectividad',
        prioridad: 'Crítica',
        tiempo: '2 h hábiles',
        subcategorias: [
            { value: 'wifi', label: 'Sin señal de Wi-Fi' },
            { value: 'cable', label: 'Punto de red dañado' }
        ]
    },
    climatizacion: {
        label: 'Climatización',
        prioridad: 'Alta',
        tiempo: '8 h hábiles',
        subcategorias: [
            { value: 'aire', label: 'Aire acondicionado no enfria' }
        ]
    },
    electrico: {
        label: 'Eléctrico',
        prioridad: 'Alta',
        tiempo: '8 h hábiles',
        subcategorias: [
            { value: 'tomacorriente', label: 'Tomacorriente sin energía' },
            { value: 'luminaria', label: 'Foco o luminaria quemada / parpadeando' },
            { value: 'tablero', label: 'Tablero eléctrico / extensión dañada' }
        ]
    },
    limpieza: {
        label: 'Limpieza',
        prioridad: 'Media',
        tiempo: '24 h hábiles',
        subcategorias: [
            { value: 'derrame', label: 'Derrame de líquidos' }
        ]
    },
    mobiliario: {
        label: 'Mobiliario',
        prioridad: 'Baja',
        tiempo: '72 h hábiles',
        subcategorias: [
            { value: 'silla', label: 'Silla / carpeta dañada' }
        ]
    },
    accesos: {
        label: 'Accesos y cerraduras',
        prioridad: 'Alta',
        tiempo: '8 h hábiles',
        subcategorias: [
            { value: 'cerradura', label: 'Chapa o cerradura trabada' },
            { value: 'puerta', label: 'Puerta dañada o descuadrada' },
            { value: 'control_acceso', label: 'Falla en control de acceso / tarjeta' }
        ]
    }
};

export const NewTicket = () => {
    const navigate = useNavigate();

    const [datosTicket, setDatosTicket] = useState({
        categoria: 'audiovisuales',
        subcategoria: 'proyector',
        ambiente: '',
        asunto: '',
        descripcion: ''
    });

    const [duplicado, setDuplicado] = useState(null);
    const [ticketCreado, setTicketCreado] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatosTicket({
            ...datosTicket,
            [name]: value
        });
    };

    const opcionesCategorias = Object.keys(CONFIG_CATEGORIAS).map((key) => ({
        value: key,
        label: CONFIG_CATEGORIAS[key].label
    }));

    const categoriaSeleccionada = CONFIG_CATEGORIAS[datosTicket.categoria];
    const opcionesSubcategorias = categoriaSeleccionada ? categoriaSeleccionada.subcategorias : [];
    const categoriaActual = CONFIG_CATEGORIAS[datosTicket.categoria] || CONFIG_CATEGORIAS.audiovisuales;

    /* Detección de duplicados */
    useEffect(() => {
        if (!datosTicket.ambiente.trim()) {
            setDuplicado(null);
            return;
        }

        const ticketsExistentes = JSON.parse(localStorage.getItem('tickets')) || [];

        const ticketExistente = ticketsExistentes.find(
            (t) =>
                t.ambiente.toLowerCase().trim() === datosTicket.ambiente.toLowerCase().trim() &&
                t.categoria === datosTicket.categoria &&
                t.estado === 'Abierto'
        );

        if (ticketExistente) {
            setDuplicado({
                codigo: ticketExistente.codigo,
                tiempo: '18 minutos'
            });
        } else {
            setDuplicado(null);
        }
    }, [datosTicket.ambiente, datosTicket.categoria]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!datosTicket.ambiente.trim() || !datosTicket.asunto.trim() || !datosTicket.descripcion.trim()) {
            alert('Por favor completa todos los campos obligatorios.');
            return;
        }

        const ahora = new Date();
        ahora.setHours(ahora.getHours() + 2);
        const hh = String(ahora.getHours()).padStart(2, '0');
        const mm = String(ahora.getMinutes()).padStart(2, '0');
        const dd = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const yyyy = ahora.getFullYear();

        const tiempoEstimadoTexto = `${categoriaActual.tiempo} · antes de las ${hh}:${mm} del ${dd}/${mes}/${yyyy}`;

        const nuevoTicket = {
            id: Date.now(),
            codigo: `TCK-2026-${String(Math.floor(100 + Math.random() * 90000)).padStart(5, '0')}`,
            ...datosTicket,
            categoriaNombre: categoriaActual.label,
            prioridad: categoriaActual.prioridad,
            tiempoEsperado: tiempoEstimadoTexto,
            estado: 'Abierto',
            fechaCreacion: new Date().toLocaleString()
        };

        const ticketsExistentes = JSON.parse(localStorage.getItem('tickets')) || [];
        localStorage.setItem('tickets', JSON.stringify([nuevoTicket, ...ticketsExistentes]));

        // Dispara la vista de confirmación
        setTicketCreado(nuevoTicket);
    };

    /* RENDERING CONDICIONAL DE LA CONFIRMACIÓN */
    if (ticketCreado) {
        return <TicketConfirmation ticket={ticketCreado} />;
    }

    /* RENDERING NORMAL DEL FORMULARIO */
    return (
        <div className="new-ticket-container">
            <PageHeader
                title="Registrar un ticket"
                description="Indica qué falla y dónde. La prioridad se sugiere según la categoría y el supervisor puede ajustarla."
            />

            {duplicado && (
                <Alert
                    variant="warning"
                    actions={<button className="btn-alerta-duplicado">Ver ese ticket</button>}
                >
                    Ya existe un ticket abierto para <strong>{datosTicket.ambiente}</strong> en {categoriaActual.label}: <strong>{duplicado.codigo}</strong>, registrado hace {duplicado.tiempo}. Revísalo antes de crear otro.
                </Alert>
            )}

            <div className="new-ticket-grid">
                <div className="main-form-card">
                    <form className="ticket-form" onSubmit={handleSubmit}>

                        <div className="form-row">
                            <div className="input-group">
                                <label>CATEGORÍA</label>
                                <SelectInput
                                    name="categoria"
                                    value={datosTicket.categoria}
                                    onChange={handleChange}
                                    options={opcionesCategorias}
                                />
                            </div>

                            <div className="input-group">
                                <label>SUBCATEGORÍA</label>
                                <SelectInput
                                    name="subcategoria"
                                    value={datosTicket.subcategoria}
                                    onChange={handleChange}
                                    options={opcionesSubcategorias}
                                />
                                <span className="field-help-text">Depende de la categoría elegida.</span>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="input-group">
                                <label>AMBIENTE</label>
                                <div className="search-input-wrapper">
                                    <TextInput
                                        name="ambiente"
                                        value={datosTicket.ambiente}
                                        onChange={handleChange}
                                        placeholder="Ej: A-201"
                                    />
                                    <Button type="button" variant="secondary">Buscar</Button>
                                </div>
                                <span className="field-help-text">Aula · Pabellón A - piso 2</span>
                            </div>

                            <div className="input-group">
                                <label>PRIORIDAD SUGERIDA</label>
                                <div className="priority-badge-box">
                                    <span className={`priority-tag ${categoriaActual.prioridad.toLowerCase()}`}>
                                        {categoriaActual.prioridad}
                                    </span>
                                    <span className="priority-label-text">Sugerida por la subcategoría</span>
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>ASUNTO</label>
                            <TextInput
                                name="asunto"
                                value={datosTicket.asunto}
                                onChange={handleChange}
                                placeholder="Resumen breve del problema"
                            />
                        </div>

                        <div className="input-group">
                            <label>DESCRIPCIÓN</label>
                            <textarea
                                name="descripcion"
                                className="text-area-input"
                                value={datosTicket.descripcion}
                                onChange={handleChange}
                                rows={4}
                                maxLength={600}
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
                            <Button type="submit" variant="primary">Registrar ticket</Button>
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
                        </div>

                    </form>
                </div>

                <aside className="info-sidebar">
                    <div className="info-card">
                        <h3>Qué conviene incluir</h3>
                        <ul className="info-list">
                            <li>El código del ambiente tal como aparece en la puerta.</li>
                            <li>Desde cuándo ocurre la falla y si es intermitente.</li>
                            <li>Qué ya intentaste (cambiar cable, reiniciar equipo).</li>
                            <li>Si hay clase o evento en las próximas horas.</li>
                            <li>Un teléfono de contacto si hay que coordinar el acceso.</li>
                        </ul>
                    </div>

                    <div className="info-card time-card">
                        <h4>Tiempo esperado para esta categoría</h4>
                        <p>
                            Prioridad {categoriaActual.prioridad.toLowerCase()}: atención dentro de <strong>{categoriaActual.tiempo}</strong> desde el registro.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};