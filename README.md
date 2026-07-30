# 🎤 Backend — Karaoke Morat

API REST para gestionar invitados y controlar el ingreso a un evento, construida con **Node.js + Express + SQLite**.

## Estructura del proyecto

```
morat-backend/
├── server.js                    # punto de entrada
├── config/
│   └── db.js                    # conexión SQLite + creación de tabla
├── models/
│   └── invitadoModel.js         # todas las queries SQL (capa de datos)
├── controllers/
│   └── invitadosController.js   # lógica de request/response y validaciones
├── routes/
│   └── invitadosRoutes.js       # definición de endpoints REST
├── database/
│   └── morat.db                 # se crea automáticamente al iniciar
├── public/
│   └── index.html               # panel de prueba para consumir la API
└── package.json
```

## Instalación y ejecución

```bash
cd morat-backend
npm install
npm start
```

El servidor queda corriendo en `http://localhost:3000`.

- Panel de prueba: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

> `public/index.html` ya es tu **landing completa de Karaoke Morat** (hero, CTA, panel admin con PIN, escáner QR) conectada directo a esta API — no es solo una página de prueba. Ábrela con el servidor corriendo y todo lo que agregues/marques queda guardado en `database/morat.db`, incluso si reinicias el servidor.

Para desarrollo con recarga automática (necesita `nodemon`, ya está en devDependencies):

```bash
npm run dev
```

> No necesitas instalar SQLite por separado: `sqlite3` (el paquete npm) trae el motor embebido y crea el archivo `database/morat.db` solo la primera vez que corres el servidor.

## Modelo de datos

Tabla `invitados`:

| Campo        | Tipo    | Notas                                       |
|--------------|---------|----------------------------------------------|
| id           | INTEGER | autoincremental, nunca se reutiliza           |
| nombre       | TEXT    | obligatorio                                   |
| tipo         | TEXT    | `Invitado` \| `Artista` \| `Staff` (default `Invitado`) |
| cod          | TEXT    | único, generado automático: `MORAT-001`, `MORAT-002`... |
| estado       | TEXT    | `pendiente` \| `ingreso` \| `falta`           |
| horaIngreso  | TEXT    | se llena solo al marcar ingreso               |
| creadoEn     | TEXT    | timestamp automático                          |

## Endpoints

Base URL: `/api/invitados`

| Método | Ruta                      | Descripción                                         |
|--------|---------------------------|------------------------------------------------------|
| POST   | `/`                       | Crea un invitado, genera su código único              |
| GET    | `/`                       | Lista invitados (filtros opcionales por query string)  |
| GET    | `/:cod`                   | Obtiene un invitado por su código                     |
| PATCH  | `/ingreso/:cod`           | Marca ingreso por código y guarda la hora              |
| PATCH  | `/:id/estado`             | Cambia el estado manualmente (`pendiente`/`ingreso`/`falta`) |
| DELETE | `/:id`                    | Elimina un invitado                                   |
| GET    | `/stats/resumen`          | Totales: total, ingresados, no asistieron, pendientes |

Filtros disponibles en `GET /api/invitados`: `?tipo=Artista`, `?estado=ingreso`, `?q=juan` (busca por nombre).

### Ejemplos con curl

**Crear invitado**
```bash
curl -X POST http://localhost:3000/api/invitados \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Juan Pérez", "tipo": "Invitado"}'
```
Respuesta:
```json
{
  "mensaje": "Invitado creado correctamente.",
  "invitado": {
    "id": 1,
    "nombre": "Juan Pérez",
    "tipo": "Invitado",
    "cod": "MORAT-001",
    "estado": "pendiente",
    "horaIngreso": null,
    "creadoEn": "2026-07-22 21:10:00"
  }
}
```

**Listar invitados**
```bash
curl http://localhost:3000/api/invitados
```

**Marcar ingreso (para el escáner QR del frontend)**
```bash
curl -X PATCH http://localhost:3000/api/invitados/ingreso/MORAT-001
```
- Si el código no existe → `404`
- Si ya había ingresado → `409` con el invitado en la respuesta (así el frontend puede mostrar "ya había ingresado")
- Si todo sale bien → `200` con `horaIngreso` guardada

**Cambiar estado manualmente (ej. marcar "no asistió")**
```bash
curl -X PATCH http://localhost:3000/api/invitados/1/estado \
  -H "Content-Type: application/json" \
  -d '{"estado": "falta"}'
```

**Eliminar invitado**
```bash
curl -X DELETE http://localhost:3000/api/invitados/1
```

**Estadísticas / aforo**
```bash
curl http://localhost:3000/api/invitados/stats/resumen
```
```json
{ "total": 10, "ingresados": 4, "noAsistieron": 1, "pendientes": 5 }
```

## Conectar con tu frontend HTML/JS

El backend ya tiene `cors()` habilitado, así que tu landing (aunque esté en otro archivo/puerto/dominio) puede llamarlo directo con `fetch`. **De hecho, `public/index.html` ya está conectado así**: usa una constante `API_BASE` al inicio de su `<script>` que, al servirse desde este mismo backend, queda como ruta relativa (`/api/invitados`) — sin configurar nada más.

Si prefieres alojar la landing en otro dominio/servidor, solo cambia esa constante por la URL completa:

```js
const API = "http://localhost:3000/api/invitados"; // cambia por tu dominio en producción

// Crear invitado
async function agregarInvitado(nombre, tipo){
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, tipo })
  });
  return res.json();
}

// Listar invitados
async function listarInvitados(){
  const res = await fetch(API);
  const data = await res.json();
  return data.invitados;
}

// Marcar ingreso (ideal para conectar con tu escáner QR)
async function marcarIngreso(cod){
  const res = await fetch(`${API}/ingreso/${cod}`, { method: "PATCH" });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error);
  return data.invitado;
}
```

Esto es exactamente lo que usa `public/index.html` como ejemplo funcional — ábrelo mientras el servidor está corriendo y pruébalo en el navegador.

## Notas de producción

- SQLite queda perfecto para un evento (cientos/pocos miles de registros). Si más adelante necesitas múltiples eventos concurrentes con mucha escritura simultánea, migrar a PostgreSQL es sencillo porque toda la lógica SQL está aislada en `models/invitadoModel.js`.
- Agrega un `.env` con `PORT=3000` si necesitas cambiar el puerto (ya está preparado con `process.env.PORT`).
- Si vas a exponerlo públicamente, considera agregar autenticación (API key o JWT) al menos en las rutas de escritura (`POST`, `PATCH`, `DELETE`).
