import { DocumentosSectionQuoteAir } from "./DocumentosSectionQuoteAir";
import { DocumentosSectionQuoteOcean } from "./DocumentosSectionQuoteOcean";

interface QuoteOperationalDocumentsSectionProps {
  mode: "air" | "ocean";
  quoteNumber: string | null | undefined;
  loading?: boolean;
  onCountChange?: (count: number) => void;
}

export function QuoteOperationalDocumentsSection({
  mode,
  quoteNumber,
  loading = false,
  onCountChange,
}: QuoteOperationalDocumentsSectionProps) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando cotización vinculada...</span>
        </div>
      </div>
    );
  }

  const resolvedQuoteNumber = quoteNumber?.trim();
  if (!resolvedQuoteNumber) {
    return (
      <div className="text-center py-4 text-muted">
        No se encontró una cotización vinculada a esta operación.
      </div>
    );
  }

  if (mode === "air") {
    return (
      <DocumentosSectionQuoteAir
        quoteNumber={resolvedQuoteNumber}
        onCountChange={onCountChange}
      />
    );
  }

  return (
    <DocumentosSectionQuoteOcean
      quoteNumber={resolvedQuoteNumber}
      onCountChange={onCountChange}
    />
  );
}
