# MCP Linbis Analyzer

Servidor MCP en TypeScript que analiza la API de Linbis y la compara con los endpoints ya usados en el portal de clientes.

## Herramientas

| Tool | Descripción |
|------|-------------|
| `get_linbis_endpoints` | Descarga `https://api.linbis.com/swagger.json` y devuelve todos los endpoints agrupados por módulo/tag. |
| `get_portal_endpoints` | Escanea el código del portal buscando llamadas a `api.linbis.com`. |
| `analyze_endpoint_gaps` | Cruza ambas fuentes y devuelve endpoints no usados, notas de valor y un top 10 priorizado. |

## Requisitos

- Node.js 20+
- Acceso de red a `https://api.linbis.com/swagger.json` (si no está disponible, usa fallback local)

## Instalación

```bash
cd mcp-linbis-analyzer
npm install
npm run build
```

## Ejecución local (stdio)

```bash
npm run dev
# o tras compilar:
npm start
```

## Conectar en Cursor

1. Compila el proyecto: `npm run build`
2. Abre **Cursor Settings → MCP**
3. Pega el contenido de `mcp.json` (ajusta las rutas si tu repo está en otra ubicación)

Ejemplo de configuración:

```json
{
  "mcpServers": {
    "linbis-analyzer": {
      "command": "node",
      "args": [
        "C:/Users/elxpa/OneDrive/Documentos/GitHub/Clientes.seemanngroup/mcp-linbis-analyzer/dist/index.js"
      ],
      "env": {
        "PORTAL_SRC_PATH": "C:/Users/elxpa/OneDrive/Documentos/GitHub/Clientes.seemanngroup/src",
        "LINBIS_SWAGGER_FALLBACK_PATH": "C:/Users/elxpa/OneDrive/Documentos/GitHub/Clientes.seemanngroup/swagger.md"
      }
    }
  }
}
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORTAL_SRC_PATH` | Ruta absoluta a `src/` del portal. Por defecto: `../src` relativo a este paquete. |
| `LINBIS_SWAGGER_FALLBACK_PATH` | OpenAPI local si el fetch remoto falla. Por defecto: `../swagger.md` del repo. |

## Uso en el chat de Cursor

Ejemplos de prompts:

- "Usa `get_linbis_endpoints` y dime cuántos módulos expone Linbis."
- "Ejecuta `get_portal_endpoints` y lista los endpoints únicos que ya usamos."
- "Corre `analyze_endpoint_gaps` y dame el top 5 de endpoints a integrar en el portal."

## Estructura

```
mcp-linbis-analyzer/
  src/
    index.ts          # Entry point MCP (stdio)
    tools/
      linbis.ts       # Fetch y parseo de swagger
      portal.ts       # Escaneo del codebase
      analyzer.ts     # Análisis de brechas
  mcp.json            # Config lista para Cursor
  package.json
  tsconfig.json
```

## Notas

- El swagger se intenta descargar en cada llamada (sin caché). Si `swagger.json` no responde, se lee el fallback local configurado.
- El escaneo del portal usa `fs` recursivo sobre archivos `.ts`, `.tsx`, `.js`, `.jsx`.
- La priorización es heurística (tracking, documentos, facturas, cotizaciones, embarques, etc.).
