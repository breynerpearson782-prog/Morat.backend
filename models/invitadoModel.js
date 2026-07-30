// models/invitadoModel.js
// Capa de acceso a datos: toda la lógica SQL vive aquí, envuelta en Promises
// para poder usar async/await limpio en el controlador.

const db = require("../config/db");

/**
 * Genera un código único legible a partir del id autoincremental de la fila.
 * Ej: id 7 -> "MORAT-007"
 */
function formatearCodigo(id) {
  return "MORAT-" + String(id).padStart(3, "0");
}

/**
 * Crea un invitado y le asigna un código único automático basado en su id.
 * @param {{nombre: string, tipo: string}} datos
 * @returns {Promise<object>} el invitado creado completo
 */
function crearInvitado({ nombre, tipo }) {
  return new Promise((resolve, reject) => {
    const sqlInsert = `
      INSERT INTO invitados (nombre, tipo, estado, horaIngreso)
      VALUES (?, ?, 'pendiente', NULL)
    `;

    db.run(sqlInsert, [nombre, tipo], function (err) {
      if (err) return reject(err);

      const nuevoId = this.lastID;
      const cod = formatearCodigo(nuevoId);

      db.run("UPDATE invitados SET cod = ? WHERE id = ?", [cod, nuevoId], (err2) => {
        if (err2) return reject(err2);

        db.get("SELECT * FROM invitados WHERE id = ?", [nuevoId], (err3, row) => {
          if (err3) return reject(err3);
          resolve(row);
        });
      });
    });
  });
}

/**
 * Lista invitados, con filtros opcionales por tipo, estado o texto de búsqueda.
 * @param {{tipo?: string, estado?: string, q?: string}} filtros
 */
function listarInvitados({ tipo, estado, q } = {}) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM invitados WHERE 1=1";
    const params = [];

    if (tipo) {
      sql += " AND tipo = ?";
      params.push(tipo);
    }
    if (estado) {
      sql += " AND estado = ?";
      params.push(estado);
    }
    if (q) {
      sql += " AND nombre LIKE ?";
      params.push(`%${q}%`);
    }

    sql += " ORDER BY id ASC";

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function obtenerPorId(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM invitados WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function obtenerPorCodigo(cod) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM invitados WHERE cod = ?", [cod], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Marca el ingreso de un invitado por su código y guarda la hora exacta.
 * Es idempotente a nivel de datos: si ya había ingresado, no pisa la hora original
 * (el controlador decide si eso es un conflicto 409 o no).
 */
function marcarIngresoPorCodigo(cod) {
  return new Promise((resolve, reject) => {
    const horaIngreso = new Date().toLocaleString("es-CO", { hour12: false });

    db.run(
      "UPDATE invitados SET estado = 'ingreso', horaIngreso = ? WHERE cod = ?",
      [horaIngreso, cod],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve(null); // no existe ese código

        db.get("SELECT * FROM invitados WHERE cod = ?", [cod], (err2, row) => {
          if (err2) return reject(err2);
          resolve(row);
        });
      }
    );
  });
}

/**
 * Actualiza el estado de un invitado (pendiente | ingreso | falta) por su id.
 */
function actualizarEstado(id, estado) {
  return new Promise((resolve, reject) => {
    const horaIngreso = estado === "ingreso"
      ? new Date().toLocaleString("es-CO", { hour12: false })
      : null;

    db.run(
      "UPDATE invitados SET estado = ?, horaIngreso = ? WHERE id = ?",
      [estado, horaIngreso, id],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve(null);

        db.get("SELECT * FROM invitados WHERE id = ?", [id], (err2, row) => {
          if (err2) return reject(err2);
          resolve(row);
        });
      }
    );
  });
}

function eliminarInvitado(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM invitados WHERE id = ?", [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
}

/**
 * Estadísticas rápidas para dashboards / barra de aforo.
 */
function obtenerEstadisticas() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN estado = 'ingreso' THEN 1 ELSE 0 END) AS ingresados,
         SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) AS noAsistieron,
         SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
       FROM invitados`,
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve({
          total: row.total || 0,
          ingresados: row.ingresados || 0,
          noAsistieron: row.noAsistieron || 0,
          pendientes: row.pendientes || 0,
        });
      }
    );
  });
}

module.exports = {
  crearInvitado,
  listarInvitados,
  obtenerPorId,
  obtenerPorCodigo,
  marcarIngresoPorCodigo,
  actualizarEstado,
  eliminarInvitado,
  obtenerEstadisticas,
};
