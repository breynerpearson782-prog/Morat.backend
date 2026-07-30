// server.js
// Punto de entrada de la API - Backend Karaoke Morat

const express = require("express");
const cors = require("cors");
const path = require("path");

require("./config/db"); // inicializa la conexión y crea la tabla si no existe

const invitadosRoutes = require("./routes/invitadosRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middlewares ----------
app.use(cors()); // permite que el frontend HTML/JS (otro origen) consuma la API
app.use(express.json()); // parsea body JSON
app.use(express.urlencoded({ extended: true }));

// Sirve una carpeta pública opcional (útil para probar el frontend en el mismo servidor)
app.use(express.static(path.join(__dirname, "public")));

// ---------- Rutas ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "API Karaoke Morat funcionando 🎤" });
});

app.use("/api/invitados", invitadosRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// ---------- Manejador de errores central ----------
app.use((err, req, res, next) => {
  console.error("Error inesperado:", err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`\n🎤 Servidor Karaoke Morat corriendo en http://localhost:${PORT}`);
  console.log(`   Health check:  http://localhost:${PORT}/api/health`);
  console.log(`   API invitados: http://localhost:${PORT}/api/invitados\n`);
});
