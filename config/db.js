// config/db.js
// Conexión a SQLite + creación de la tabla de invitados si no existe.

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// En producción (Railway), define la variable de entorno DATABASE_PATH apuntando
// al volumen persistente, ej: DATABASE_PATH=/data/morat.db
// En local, si no la defines, usa la carpeta database/ del proyecto (comportamiento anterior).
const DB_PATH = process.env.DATABASE_PATH
  ? process.env.DATABASE_PATH
  : path.join(__dirname, "..", "database", "morat.db");

// Si la carpeta destino no existe todavía (ej. primera vez que se monta el volumen), la crea.
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
    process.exit(1);
  }
  console.log("✅ Conectado a SQLite en:", DB_PATH);
});

// Buenas prácticas: activar llaves foráneas y modo WAL (mejor concurrencia lectura/escritura)
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");
  db.run("PRAGMA journal_mode = WAL;");

  db.run(`
    CREATE TABLE IF NOT EXISTS invitados (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre        TEXT NOT NULL,
      tipo          TEXT NOT NULL DEFAULT 'Invitado',
      cod           TEXT UNIQUE,
      estado        TEXT NOT NULL DEFAULT 'pendiente',
      horaIngreso   TEXT,
      creadoEn      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `, (err) => {
    if (err) {
      console.error("❌ Error al crear la tabla 'invitados':", err.message);
    } else {
      console.log("✅ Tabla 'invitados' lista.");
    }
  });
});

module.exports = db;
