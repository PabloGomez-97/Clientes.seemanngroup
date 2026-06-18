import type { NavigateFunction } from "react-router-dom";
import { getFileBadge, type GroupTransportType } from "./docTransportTokens";
import type { DocItem } from "./docTransportTokens";

export type UnifiedDoc = DocItem & { _type: GroupTransportType };

export interface DocGroup {
  key: string;
  type: GroupTransportType;
  title: string;
  subtitle: string | null;
  docs: UnifiedDoc[];
  latestTimestamp: number;
  sortValue: number;
  lookupValue: string | null;
}

interface Destination {
  to: string;
  state: Record<string, unknown>;
}

interface Props {
  group: DocGroup;
  isExpanded: boolean;
  destination: Destination;
  canDelete: boolean;
  deletingId: string | null;
  downloadingId: string | null;
  onToggle: () => void;
  onNavigate: NavigateFunction;
  onDownload: (doc: UnifiedDoc) => void;
  onDelete: (doc: UnifiedDoc) => void;
  formatFecha: (fechaISO: string) => string;
  formatFechaFull: (fechaISO: string) => string;
}

export function DocGroupSection({
  group,
  isExpanded,
  destination,
  canDelete,
  deletingId,
  downloadingId,
  onToggle,
  onNavigate,
  onDownload,
  onDelete,
  formatFecha,
  formatFechaFull,
}: Props) {
  return (
    <section className={`doc-group${isExpanded ? " doc-group--open" : ""}`}>
      <div
        className="doc-group__header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="doc-group__copy">
          <div className="doc-group__title-row">
            <div className="doc-group__title">{group.title}</div>
            <button
              type="button"
              className="doc-group__view"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(destination.to, { state: destination.state });
              }}
            >
              {group.type === "quotes" ? "Ver Cotización" : "Ver Operación"}
            </button>
          </div>
          <div className="doc-group__subtitle">
            {group.subtitle ||
              "Documentos agrupados bajo esta referencia"}
          </div>
        </div>

        <div className="doc-group__meta">
          <span>
            {group.docs.length} documento
            {group.docs.length !== 1 ? "s" : ""}
          </span>
          <span className="doc-group__toggle">
            {isExpanded ? "Cerrar" : "Abrir"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="doc-group__body">
          <div className="doc-group__table-header">
            <div className="doc-group__head">Documento</div>
            <div className="doc-group__head">Tipo</div>
            <div className="doc-group__head">Fecha</div>
            <div className="doc-group__head doc-group__head--actions">
              Acciones
            </div>
          </div>

          {group.docs.map((doc) => {
            const isDeleting = deletingId === doc.id;
            const isDownloading = downloadingId === doc.id;

            return (
              <div key={doc.id} className="doc-row">
                <div className="doc-document" title={doc.nombreArchivo}>
                  <span className="doc-file-badge">
                    {getFileBadge(doc.tipoArchivo)}
                  </span>
                  <div className="doc-document__copy">
                    <div className="doc-document__name">{doc.nombreArchivo}</div>
                    <div className="doc-document__size">{doc.tamanoMB} MB</div>
                  </div>
                </div>

                <div className="doc-type-cell">
                  <span className="doc-type-badge" title={doc.tipo}>
                    {doc.tipo}
                  </span>
                </div>

                <div
                  className="doc-date"
                  title={formatFechaFull(doc.fechaSubida)}
                >
                  {formatFecha(doc.fechaSubida)}
                </div>

                <div className="doc-actions">
                  <button
                    type="button"
                    className="doc-action-link"
                    onClick={() => onDownload(doc)}
                    disabled={isDownloading || isDeleting}
                  >
                    {isDownloading ? "Descargando..." : "Descargar"}
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      className="doc-action-link"
                      onClick={() => onDelete(doc)}
                      disabled={isDeleting || isDownloading}
                    >
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
