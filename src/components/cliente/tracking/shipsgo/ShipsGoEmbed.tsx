const EMBED_BASE_URL = "https://embed.shipsgo.com/";

export type ShipsGoEmbedTransport = "air" | "ocean";

export function buildShipsGoEmbedUrl(
  transport: ShipsGoEmbedTransport,
  query: string,
): string | null {
  const token = import.meta.env.VITE_SHIPSGO_EMBED_TOKEN as string | undefined;
  if (!token?.trim() || !query.trim()) return null;

  const params = new URLSearchParams({
    token: token.trim(),
    tabs: "none",
    transport,
    query: query.trim(),
  });

  return `${EMBED_BASE_URL}?${params.toString()}`;
}

interface ShipsGoEmbedProps {
  transport: ShipsGoEmbedTransport;
  query: string;
  height?: number;
  className?: string;
}

function ShipsGoEmbed({
  transport,
  query,
  height = 380,
  className = "",
}: ShipsGoEmbedProps) {
  const embedUrl = buildShipsGoEmbedUrl(transport, query);
  const token = import.meta.env.VITE_SHIPSGO_EMBED_TOKEN as string | undefined;

  if (!token?.trim()) {
    return (
      <div className={`sg-embed-placeholder ${className}`.trim()}>
        <p>Mapa no disponible: falta configurar el token de embed.</p>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={`sg-embed-placeholder ${className}`.trim()}>
        <p>No hay un identificador válido para mostrar el mapa.</p>
      </div>
    );
  }

  return (
    <iframe
      id="shipsgo-embed"
      title="Mapa de seguimiento ShipsGo"
      src={embedUrl}
      className={`sg-embed-iframe ${className}`.trim()}
      style={{ height: `${height}px` }}
      frameBorder={0}
      allowFullScreen
    />
  );
}

export default ShipsGoEmbed;
