# Design System — Portal Cliente Seemann Group

## Fuente única de verdad

- Tokens: [`src/theme/client-theme.css`](../src/theme/client-theme.css)
- Primitivos UI: [`src/components/ui/sg-primitives.css`](../src/components/ui/sg-primitives.css)
- Componentes React: [`src/components/ui/`](../src/components/ui/)

## Tipografía

| Token | Valor |
|-------|-------|
| `--sg-font` | Plus Jakarta Sans (cargada en `index.html`) |

**No usar** Inter ni otras sans en módulos cliente nuevos.

## Colores de marca

| Token | Uso |
|-------|-----|
| `--sg-primary` | CTAs, estados activos (#ff6200) |
| `--sg-shell-bg` | Navbar y sidebar (#232f3e) |
| `--sg-bg-page` | Fondo del área principal |
| `--sg-bg-surface` | Cards y formularios |

Bootstrap hereda `--bs-primary` desde los tokens.

## Layout

| Token | Valor |
|-------|-------|
| `--sg-content-max` | 1200px — cotizadores, tracking, documentos |
| `--sg-content-wide` | 1400px — home |

Clases de página: `.sg-page`, `.sg-page__inner`

Cotizadores: `.qa-container` + `.sg-quote-layout` con panel `.sg-quote-layout__summary` sticky.

## Componentes disponibles

- `SgPage` — contenedor de página con max-width
- `SgCard` — card con header opcional
- `SgButton` — variantes primary, outline, ghost
- `SgStepper` — wizard multi-paso con `aria-current="step"`
- `SgQuoteSummary` — panel resumen sticky en cotizadores

## Dark mode

Usar `data-theme="dark"` en `<html>`. **No** usar `filter: invert` global.

Variables semánticas en `[data-theme="dark"]` dentro de `client-theme.css`.

## Checklist de coherencia (antes de merge)

- [ ] Una sola fuente (`var(--sg-font)`) en la pantalla
- [ ] Botones `.btn-primary` muestran naranja Seemann
- [ ] `max-width` del contenido principal = `--sg-content-max`
- [ ] Cotizador con panel resumen visible en desktop
- [ ] Sin gradientes competidores con la marca en navbar (AI Chat usa `.sg-ai-chat-btn`)
- [ ] Tablas anchas con `.sg-table-wrap--scroll-hint` si hay scroll horizontal
- [ ] Analytics de wizard alineados al número real de pasos

## Módulos migrados

- Shell: `UserLayout`, `Navbar`, `Sidebar`, `Footer`
- Cotizadores: `QuoteAIR`, `QuoteFCL`, `QuoteLASTMILE`
- Estilos: `Home`, `Cotizador`, `Shipsgotracking`, `CreateShipmentForm`, `QuotesView`, envíos (`Air`/`Ocean`/`Ground`)
