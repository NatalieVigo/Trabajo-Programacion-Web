-- HU-6 Encuesta de satisfacción. Por ahora solo las columnas que lee HU-1 (encuesta pendiente); el responsable de HU-6 completa el resto.

CREATE TABLE encuestas (
  id VARCHAR(10) PRIMARY KEY,
  ticket_id VARCHAR(12) NOT NULL UNIQUE,
  usuario_id VARCHAR(10) NOT NULL,
  CONSTRAINT fk_encuestas_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id),
  CONSTRAINT fk_encuestas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);
