# Contrato de datos — Mesa de Ayuda de Servicios del Campus

Este documento define la estructura de las entidades que comparten las historias funcionales: sus campos, tipos
y valores admitidos. Es la interfaz entre las historias; **cambiarlo requiere acuerdo del grupo**.

- Fuente de verdad de los datos de prueba: [`frontend/src/data/seed.json`](../frontend/src/data/seed.json) (versión **1**).
- Entrega 1: el frontend guarda una copia del seed en `localStorage` bajo la clave `mesa-ayuda:db`
  (`frontend/src/repositories/db.js`). Entrega 2: el mismo conjunto se carga en PostgreSQL.
- Las entidades de HU-1 (Cuenta y acceso) son de su responsable. Las demás son una **propuesta para acordar con el
  grupo**: HU-1 solo las lee y documenta aquí el mínimo que necesita.

## Convenciones

| Tema | Regla |
| --- | --- |
| Identificadores | Texto con prefijo de la entidad y correlativo: `usr-001`, `inv-001`, `cat-01`, `amb-01`, `tck-00147`, `enc-001`. Los nuevos se calculan con `nextId(prefijo, filas)` de `utils/ids.js`. |
| Referencias | Siempre por `id` (`usuarioId`, `categoriaId`, `ambienteId`, `asignadoA`…). |
| Fechas | ISO 8601 en UTC con milisegundos, como `Date#toISOString()`: `2026-09-30T13:12:00.000Z`. La interfaz las muestra en hora de Lima (UTC−5) como `dd/mm/aaaa` y `HH:MM`. |
| Enumerados | Minúsculas, sin tildes, con guion bajo: `en_atencion`, `critica`. Las etiquetas visibles («En atención», «Crítica») las pone la interfaz. |
| Correos | En minúsculas y únicos. Dominios institucionales: `@ulima.edu.pe` o `@aloe.ulima.edu.pe`. |
| Teléfonos | 9 dígitos que empiezan con 9, sin espacios (`987654321`); se muestran como `987 654 321`. |
| Contraseñas | Nunca en texto plano. `passwordSalt`: 32 caracteres hexadecimales aleatorios. `passwordHash`: SHA-256 en hexadecimal (minúsculas) de `passwordSalt + contraseña`. |
| Versión del seed | Si cambian `seed.json`, suban `version`: cada navegador detecta la diferencia y vuelve a sembrar su base. |

Para generar la sal y el hash de una contraseña nueva del seed:

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s, c.createHash('sha256').update(s+process.argv[1]).digest('hex'))" "MiClave2026"
```

## Errores de los servicios

Los servicios (`frontend/src/services`) se comportan como una API REST: son asíncronos y, cuando fallan, lanzan
`ServiceError { status, code, message, fieldErrors, details }`. En la entrega 2 estos mismos datos llegarán en la
respuesta de Express.

| Estado | Uso |
| --- | --- |
| 400 | Datos inválidos. `fieldErrors` trae el mensaje de cada campo: `{ correo: 'Ingresa tu correo institucional.' }`. |
| 401 | Credenciales incorrectas. |
| 403 | Acción no permitida para el rol o cuenta bloqueada por el supervisor. |
| 404 | El recurso no existe (invitación, enlace de recuperación, usuario…). |
| 409 | Conflicto con el estado actual (correo ya registrado, invitación ya usada). |
| 410 | Recurso vencido (invitación o enlace de recuperación). |
| 423 | Cuenta bloqueada temporalmente tras cinco intentos fallidos. |
| 500 | Error inesperado (`INTERNAL_ERROR`). |

## Entidades de HU-1 · Cuenta y acceso

### Usuario (`usuarios`) · dueño: HU-1

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `usr-NNN`. |
| `nombres` | string | 2 a 60 caracteres: letras (con tildes y ñ), espacios, apóstrofo y guion. |
| `apellidos` | string | Igual que `nombres`. |
| `correo` | string | Único, en minúsculas, dominio institucional. |
| `telefono` | string | 9 dígitos que empiezan con 9. |
| `rol` | enum | `usuario` · `tecnico` · `supervisor`. |
| `unidad` | string \| null | Uno de los valores de `unidades`. |
| `vinculo` | string \| null | Uno de los valores de `vinculos`. Solo para `rol = usuario`; `null` en técnicos y supervisores. |
| `especialidades` | string[] | Ids de `categorias`: de 1 a 3 para técnicos y supervisores, `[]` para usuarios. |
| `ambienteHabitualId` | string \| null | Id de `ambientes`. |
| `estado` | enum | `activo` · `bloqueado` (bloqueo administrativo de HU-7: no puede iniciar sesión). |
| `motivoBloqueo` | string \| null | Obligatorio cuando `estado = bloqueado`. |
| `passwordHash` | string | 64 caracteres hexadecimales. |
| `passwordSalt` | string | 32 caracteres hexadecimales. |
| `intentosFallidos` | number | De 0 a 5; vuelve a 0 al iniciar sesión o al restablecer la contraseña. |
| `bloqueadoHasta` | ISO \| null | Bloqueo temporal de 15 minutos tras cinco intentos fallidos. |
| `aceptaTerminos` | boolean | `true`: aceptó los términos al registrarse o al activar su invitación. |
| `invitacionId` | string \| null | Invitación con la que se activó la cuenta (técnicos y supervisores). |
| `creadoEn` | ISO | Fecha de creación de la cuenta. |
| `actualizadoEn` | ISO | Última modificación. |

Los servicios nunca devuelven `passwordHash` ni `passwordSalt` a la interfaz.

### Invitación (`invitaciones`) · dueño: HU-1

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `inv-NNN`. |
| `token` | string | Único; forma parte del enlace `/invitacion/:token`. |
| `nombres`, `apellidos` | string | Datos precargados del invitado (no editables al activar). |
| `correo` | string | Correo institucional del invitado. |
| `rol` | enum | `tecnico` · `supervisor`. |
| `telefono` | string | 9 dígitos; el invitado puede corregirlo al activar. |
| `invitadoPor` | string | Id del supervisor que invitó. |
| `estado` | enum | `pendiente` · `aceptada` · `rechazada` · `revocada`. |
| `venceEn` | ISO | Las invitaciones nuevas vencen 7 días después de `creadaEn`. Las dos de demostración vigentes del seed (`INV-TEC-2026-DEMO`, `INV-SUP-2026-DEMO`) vencen el 31/12/2026 para que sigan disponibles durante el curso. |
| `creadaEn` | ISO | |
| `respondidaEn` | ISO \| null | Momento en que se aceptó o rechazó. |

Estado derivado **vencida**: `estado = pendiente` y `venceEn` anterior a la fecha actual. No se guarda.

### Token de recuperación (`tokensRecuperacion`) · dueño: HU-1

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `rec-NNN`. |
| `token` | string | Aleatorio; forma parte del enlace `/restablecer-contrasena/:token`. |
| `usuarioId` | string | Id de `usuarios`. |
| `creadoEn` | ISO | |
| `venceEn` | ISO | `creadoEn` + 30 minutos. |
| `usadoEn` | ISO \| null | Un solo uso. |

### Solicitud de acceso (`solicitudesAcceso`) · dueño: HU-1

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `sol-NNN`. |
| `usuarioId` | string | Quien pide el acceso desde la vista 403. |
| `recurso` | string | Lo que intentó ver, por ejemplo «la cola de atención». |
| `creadaEn` | ISO | |

## Entidades de otras historias (HU-1 solo las lee)

### Categoría (`categorias`) · dueño: HU-2 · Propuesta para acordar con el grupo

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `cat-NN`. |
| `nombre` | string | Único. |
| `descripcion` | string | Texto corto (máx. 240 caracteres) que se muestra en la landing. |
| `activa` | boolean | Las inactivas no admiten tickets nuevos ni aparecen en la landing. |
| `prioridadPorDefecto` | enum | `critica` · `alta` · `media` · `baja`. |
| `tiempoEsperadoHoras` | number | Horas hábiles de atención esperada. |

HU-1 la usa para la landing y para las especialidades de técnicos y supervisores.

### Ambiente (`ambientes`) · dueño: HU-2 · Propuesta para acordar con el grupo

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `amb-NN`. |
| `codigo` | string | Único, tal como aparece en la puerta: `A-201`, `H-210`, `BIB-P2`. |
| `nombre` | string | |
| `tipo` | enum | `aula` · `laboratorio` · `auditorio` · `oficina` · `biblioteca`. |
| `pabellon` | string | `A`, `H`, `Central`… |
| `sede` | string | `Monterrico`. |

HU-1 lo usa para el «Ambiente habitual» de Mi cuenta.

### Unidades (`unidades`) y vínculos (`vinculos`) · Propuesta para acordar con el grupo

Listas de valores (strings) que usa HU-1 en el registro y en Mi cuenta.

| Lista | Valores |
| --- | --- |
| `unidades` | Ingeniería de Sistemas, Ingeniería Industrial, Ingeniería Civil, Arquitectura, Administración, Contabilidad y Finanzas, Economía, Marketing, Negocios Internacionales, Comunicación, Derecho, Psicología, Dirección de Infraestructura y Servicios, Biblioteca, Bienestar Universitario. |
| `vinculos` | Estudiante, Docente, Personal administrativo, Egresado. |

### Ticket (`tickets`) · dueño: HU-3 · Propuesta para acordar con el grupo

Mínimo que necesita HU-1 para los contadores de la cabecera, el menú lateral y Mi cuenta.

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `tck-NNNNN`. |
| `codigo` | string | Único: `TCK-2026-NNNNN`. |
| `asunto` | string | Resumen de la falla. |
| `usuarioId` | string | Quién lo reportó. |
| `categoriaId` | string | Id de `categorias`. |
| `ambienteId` | string | Id de `ambientes`. |
| `asignadoA` | string \| null | Id del técnico; `null` = en cola sin asignar. El técnico debe tener la categoría entre sus especialidades. |
| `estado` | enum | `abierto` · `en_atencion` · `en_espera` · `resuelto` · `cerrado` · `reabierto`. |
| `prioridad` | enum | `critica` · `alta` · `media` · `baja`. |
| `creadoEn` | ISO | |
| `cerradoEn` | ISO \| null | Solo cuando `estado = cerrado`. |

### Encuesta (`encuestas`) · dueño: HU-6 · Propuesta para acordar con el grupo

| Campo | Tipo | Valores admitidos / notas |
| --- | --- | --- |
| `id` | string | `enc-NNN`. |
| `ticketId` | string | Una sola encuesta por ticket. |
| `usuarioId` | string | Quien respondió (el que reportó el ticket). |
| `puntaje` | number | Entero de 1 a 5. |
| `respondidaEn` | ISO | |

**Encuesta pendiente**: ticket `cerrado` del usuario, sin encuesta, cuyo `cerradoEn` + 7 días aún no pasó.

## Contenido del seed

| Tabla | Filas | Escenarios que cubre |
| --- | --- | --- |
| `usuarios` | 10 | 5 usuarios, 4 técnicos y 1 supervisor (ver «Cuentas de demostración»). Diego Salas Vera está bloqueado («Reportes falsos reiterados.»); Andrea Chávez Loayza no tiene tickets (estados vacíos). |
| `invitaciones` | 4 | `INV-TEC-2026-DEMO` y `INV-SUP-2026-DEMO` vigentes hasta el 31/12/2026; `INV-TEC-2026-VENCIDA` (venció el 12/09/2026); `INV-TEC-2026-USADA` (aceptada por Julio Paredes). |
| `tokensRecuperacion` | 0 | Se crean al pedir la recuperación de contraseña. |
| `solicitudesAcceso` | 0 | Se crean desde la vista 403. |
| `categorias` | 7 | Las siete categorías activas de los mockups. |
| `ambientes` | 11 | Campus Monterrico, con todos los tipos (la oficina C-102 no tiene tickets). |
| `unidades` | 15 | Carreras y unidades administrativas. |
| `vinculos` | 4 | |
| `tickets` | 14 | Camila reportó 12: 3 en curso (abierto, en atención y en espera), 1 resuelto y 8 cerrados. Julio Paredes tiene 8 asignados. TCK-2026-00146 y TCK-2026-00147 están en cola sin asignar. |
| `encuestas` | 7 | Todas de Camila (promedio 4.3). TCK-2026-00131 se cerró el 28/09/2026 sin encuesta: queda pendiente hasta el 05/10/2026. |

### Cuentas de demostración

| Rol | Nombre | Correo | Escenario |
| --- | --- | --- | --- |
| Usuario | Camila Alejandra Quispe Ramos | `camila.quispe@aloe.ulima.edu.pe` | Ingeniería de Sistemas · Estudiante · ambiente A-201. 12 tickets (3 en curso) y 1 encuesta pendiente. |
| Técnico | Julio César Paredes Soto | `jparedes@ulima.edu.pe` | Audiovisuales y Redes y conectividad; 8 tickets asignados. |
| Supervisor | Lucía Mendoza Ríos | `lmendoza@ulima.edu.pe` | Climatización y Eléctrico; envió las invitaciones del seed. 2 tickets en cola sin asignar. |
| Usuario bloqueado | Diego Salas Vera | `diego.salas@aloe.ulima.edu.pe` | Bloqueado por el supervisor («Reportes falsos reiterados.»). |
| Usuarios | Renzo Salazar Núñez · Milagros Ccahuana Ríos · Andrea Chávez Loayza | `renzo.salazar@aloe.ulima.edu.pe` · `mccahuana@ulima.edu.pe` · `achavez@ulima.edu.pe` | Andrea no tiene tickets (estados vacíos). |
| Técnicos | Marco Huamán Vela · Iván Zegarra Pinto · Sandra Nolasco Ríos | `mhuaman@ulima.edu.pe` · `izegarra@ulima.edu.pe` · `snolasco@ulima.edu.pe` | |

Las contraseñas solo se guardan con sal y hash. Su texto plano aparece únicamente en las pruebas
(`frontend/src/utils/password.test.js`), que comprueban que cada una coincida con el hash del seed.
