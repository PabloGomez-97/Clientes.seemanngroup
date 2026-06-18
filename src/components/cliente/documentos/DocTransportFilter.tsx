import { FILTER_OPTIONS, type TransportType } from "./docTransportTokens";

interface Props {
  activeType: TransportType;
  counts: Record<TransportType, number>;
  onChange: (type: TransportType) => void;
  resultsSummary?: string | null;
}

export function DocTransportFilter({
  activeType,
  counts,
  onChange,
  resultsSummary,
}: Props) {
  return (
    <div className="doc-filter-bar">
      <div
        className="doc-filter-segmented"
        role="radiogroup"
        aria-label="Filtrar documentos por tipo"
      >
        {FILTER_OPTIONS.map(({ key, label }) => {
          const active = activeType === key;

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${label}, ${counts[key]} documentos`}
              className={`doc-filter-segment${active ? " is-active" : ""}`}
              onClick={() => onChange(key)}
            >
              <span className="doc-filter-segment__label">{label}</span>
              <span className="doc-filter-segment__count">{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {resultsSummary && (
        <p className="doc-filter-summary">{resultsSummary}</p>
      )}
    </div>
  );
}
