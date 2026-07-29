# MCP ShipsGo

Servidor MCP en TypeScript para explorar y llamar la API de ShipsGo desde Cursor, usando el OpenAPI local (`openapi.json`).

## Herramientas

| Tool | Descripción |
|------|-------------|
| `list_specs` | Lista el/los OpenAPI disponibles |
| `list_endpoints` | Lista paths/métodos (filtro opcional por tag) |
| `search_endpoints` | Busca endpoints por texto |
| `get_endpoint` | Detalle de un endpoint (params, body, schemas) |
| `get_auth_info` | Metadatos de auth (sin exponer el token) |
| `execute_request` | Ejecuta requests autenticados a `https://api.shipsgo.com/v2` |

## Seguridad

- El token **nunca** va en `mcp.json`, commits ni respuestas de tools.
- Se lee solo de `SHIPSGO_API_TOKEN` en el `.env` del repo (ya en `.gitignore`).
- Header inyectado automáticamente: `X-Shipsgo-User-Token`.
- Cualquier eco de request/response redactea tokens y headers sensibles.

## Requisitos

- Node.js 20+
- Variable `SHIPSGO_API_TOKEN` en el `.env` de la raíz del repo

## Instalación

```bash
cd mcp-shipsgo
npm install
npm run build
```

## Conectar en Cursor

Usa `mcp.json` de este paquete (rutas absolutas). No agregues el token ahí.

Variables opcionales:

| Variable | Descripción |
|----------|-------------|
| `SHIPSGO_OPENAPI_PATH` | Ruta al OpenAPI local (default: `./openapi.json`) |
| `SHIPSGO_DOTENV_PATH` | Ruta al `.env` (default: `../.env` del repo) |
| `SHIPSGO_BASE_URL` | Base URL (default: `https://api.shipsgo.com/v2`) |

## Uso en el chat

- "Usa `list_endpoints` de shipsgo y muéstrame los de ocean."
- "Busca endpoints de geojson en shipsgo."
- "Dame el detalle de `POST /ocean/shipments`."
- "Ejecuta `GET /ocean/carriers` con shipsgo."

## Estructura

```
mcp-shipsgo/
  openapi.json        # Spec oficial ShipsGo v2
  src/
    index.ts          # Entry MCP (stdio)
    config.ts         # Env + redacción de secretos
    tools/
      openapi.ts      # list/search/get
      execute.ts      # llamadas autenticadas
  mcp.json
```
