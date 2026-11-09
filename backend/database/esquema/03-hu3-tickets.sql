-- HU-3 Registro de tickets. Por ahora solo las columnas que lee HU-1 (resumen de Mi cuenta y contadores); el responsable de HU-3 completa el resto.

CREATE TABLE tickets (
  id VARCHAR(12) PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  usuario_id VARCHAR(10) NOT NULL,
  asignado_a VARCHAR(10) NULL,
  estado VARCHAR(20) NOT NULL,
  cerrado_en DATETIME NULL,
  CONSTRAINT fk_tickets_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_tickets_tecnico FOREIGN KEY (asignado_a) REFERENCES usuarios (id)
);
