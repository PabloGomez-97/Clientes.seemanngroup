# LINEALOGISTICS FCL (Excel)

Workflow n8n para importar tarifas FCL desde correos con adjunto Excel de Linea Logistics.

## Flujo

1. **Gmail Trigger** — correos desde `dcaceres@seemanngroup.com`
2. **Get a message** — descarga adjuntos como `attachment_*`
3. **Select Excel Attachment** — detecta el único `.xlsx`/`.xls` y expone `excelAttachmentKey`
4. **Extract from File** — lee el Excel usando esa clave dinámica (no `attachment_0`)
5. **Parse LINEA Rates** — normaliza POL/POD, agrupa 20'/40' y genera filas para Google Sheets
6. **Aggregate Rows** — empaqueta `rowsJson`
7. **HTTP Request** — envía al Apps Script

## Columnas de salida (`values`)

| Índice | Campo        | Fuente Excel                          |
|--------|--------------|---------------------------------------|
| 0      | (vacío)      | —                                     |
| 1      | POL          | `POL` → ciudades (mapa configurable)  |
| 2      | POD          | `POD` sin `, CL`                      |
| 3      | 20GP         | `TOTAL FREIGHT` cuando `TYPE` = 20' / 20GP |
| 4      | 40HQ         | `TOTAL FREIGHT` cuando `TYPE` = 40' / 40HQ |
| 5      | 40' NOR      | vacío                                 |
| 6      | Carrier      | `CARRIER`                             |
| 7      | Tránsito     | vacío (no viene en el Excel)          |
| 8      | Observación  | `OBS`                                 |
| 9      | Free time    | `FT POD` → `N days`                   |
| 10     | Compañía     | `LINEALOGISTICS` (config)             |
| 11     | Moneda       | `USD` (config)                        |
| 12     | Validez      | `VALID TO` → `31 julio`               |

## Configuración sin hardcode disperso

Editar `parse-linea-rates.js`:

- `CONFIG.COMPANIA`, `CONFIG.CURRENCY`, `CONFIG.COLUMNS`
- `POL_CODE_MAP` — códigos de origen → nombre de ciudad

## POL compuesto

Si `POL` trae varios puertos separados por `/` (ej. `IOA/SSZ` → 2 filas, `PNG/IOA/SSZ` → 3 filas), se genera **una fila de salida por cada puerto** para **cada fila del Excel**.

Cada fila del Excel trae **un solo contenedor** según `TYPE` (`20'` → columna **20GP**, `40'` → columna **40HQ**); la otra columna queda vacía.

La columna `COMM` del Excel se ignora por completo.

## Importar en n8n

Importar `workflow.json` o el archivo de Downloads. Los scripts viven en esta carpeta para mantenimiento; al editar, regenerar el JSON o pegar el código en los nodos Code.
