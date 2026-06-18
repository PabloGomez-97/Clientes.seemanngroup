# Estructura de componentes — Portal Seemann Group

## Principios

1. **Un dominio = una carpeta** con responsabilidad clara (como `api/emails/` agrupa todos los templates de correo).
2. **Portales** en español, `kebab-case`: `cliente/`, `administrador/`, `proveedores/`.
3. **Cross-portal** en `shared/`.
4. **Cotizadores** permanecen en `quotes/` (reutilizados por cliente y admin).

## Anatomía de un feature

```
feature/
├── pages/          # componentes montados por rutas
├── components/     # UI del dominio
├── hooks/          # hooks del dominio
├── utils/          # helpers y types locales
└── styles/         # CSS co-localizado
```

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Carpetas portal | español, kebab-case | `administrador`, `cliente` |
| Carpetas feature | español, kebab-case | `home`, `clientes`, `pricing` |
| Componentes React | PascalCase.tsx | `HomeEjecutivo.tsx` |
| Hooks | useCamelCase.ts | `useReporteriaData.ts` |
| Utilidades | camelCase.ts | `invoiceUtils.ts` |

## Árbol objetivo

```
src/components/
├── shared/           # layout, maps, itinerary, notifications, tracking
├── quotes/           # cotizadores (AIR, FCL, LCL, LASTMILE)
├── cliente/          # portal cliente (ex Sidebar/)
├── administrador/    # portal admin/ejecutivo/operaciones/pricing
├── proveedores/      # portal proveedor
└── footer/           # páginas públicas legales
```

## Rutas

Las definiciones de rutas viven en `src/routes/`:

- `auth.routes.tsx` — login
- `admin.routes.tsx` — `/admin/*`
- `client.routes.tsx` — `/` (portal cliente)
- `provider.routes.tsx` — `/proveedor/*`
- `public.routes.tsx` — legal (privacy, terms)
- `legacy-redirects.tsx` — redirects de URLs antiguas

Al agregar una ruta admin, actualizar también `layouts/Sidebar-admin.tsx`, `config/roleRoutes.ts` y `config/adminPaths.ts`.

## Datos de demo

Mocks de Mundogaming viven en `src/mocks/mundogaming/` (aislados del código de producción).

## Alias TypeScript

Usar `@/` como prefijo de `src/`:

```ts
import Home from "@/components/cliente/home/Home";
```

Configurado en `tsconfig.app.json` y `vite.config.ts`.
