import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

export const CLIENT_DIRECTORY_FONT =
  'var(--portal-font)';

export const CLIENT_DIRECTORY_PAGE_SIZE = 12;

export type ClientDirectorySortMode = "az" | "recent" | "subcuentas";

export type ClientDirectoryRow = {
  id?: string;
  username: string;
  email: string;
  parentUsername?: string;
  createdAt?: string;
};

type SortChipsProps = {
  sortMode: ClientDirectorySortMode;
  onSortModeChange: (mode: ClientDirectorySortMode) => void;
  font?: string;
};

export function ClientDirectorySortChips({
  sortMode,
  onSortModeChange,
  font = CLIENT_DIRECTORY_FONT,
}: SortChipsProps) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {(
        [
          { key: "az" as const, label: "A → Z" },
          { key: "recent" as const, label: "Más recientes" },
          { key: "subcuentas" as const, label: "Solo subcuentas" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() =>
            onSortModeChange(sortMode === opt.key ? "az" : opt.key)
          }
          style={{
            padding: "4px 12px",
            background: sortMode === opt.key ? "#fff7ed" : "#fff",
            border:
              sortMode === opt.key ? "1px solid #ff6200" : "1px solid #e5e7eb",
            borderRadius: 20,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: sortMode === opt.key ? 500 : 400,
            color: sortMode === opt.key ? "#9a3412" : "#6b7280",
            transition: "all 0.15s",
            fontFamily: font,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type MetaColumn = {
  header: string;
  width?: string;
  align?: "left" | "right";
  render: (client: ClientDirectoryRow) => ReactNode;
};

type ClientDirectoryListProps<T extends ClientDirectoryRow> = {
  clients: T[];
  onSelect: (client: T) => void;
  font?: string;
  pageSize?: number;
  /** Change this value to reset pagination (e.g. `${searchQuery}-${sortMode}`) */
  pageResetKey?: string;
  /** Optional columns between Email and chevron. Default: Registro from createdAt */
  metaColumns?: MetaColumn[];
  emptyState?: ReactNode;
  getRowKey?: (client: T) => string;
};

function defaultMetaColumns(): MetaColumn[] {
  return [
    {
      header: "Registro",
      width: "120px",
      align: "right",
      render: (client) =>
        client.createdAt
          ? new Date(client.createdAt).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
  ];
}

export function ClientDirectoryList<T extends ClientDirectoryRow>({
  clients,
  onSelect,
  font = CLIENT_DIRECTORY_FONT,
  pageSize = CLIENT_DIRECTORY_PAGE_SIZE,
  pageResetKey = "",
  metaColumns,
  emptyState,
  getRowKey,
}: ClientDirectoryListProps<T>) {
  const [listPage, setListPage] = useState(1);
  const columns = metaColumns ?? defaultMetaColumns();

  useEffect(() => {
    setListPage(1);
  }, [pageResetKey]);

  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
  const safePage = Math.min(listPage, totalPages);

  useEffect(() => {
    if (listPage > totalPages) setListPage(totalPages);
  }, [listPage, totalPages]);

  const pagedClients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return clients.slice(start, start + pageSize);
  }, [clients, safePage, pageSize]);

  const gridTemplateColumns = [
    "minmax(0, 1.4fr)",
    "minmax(0, 1.2fr)",
    ...columns.map((c) => c.width ?? "minmax(0, 1fr)"),
    "28px",
  ].join(" ");

  if (clients.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            No hay clientes.
          </div>
        )}
      </>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #e8eaed",
        borderRadius: 8,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          gap: 16,
          alignItems: "center",
          padding: "10px 20px",
          background: "#fafbfc",
          borderBottom: "1px solid #e8eaed",
          fontSize: 11,
          fontWeight: 600,
          color: "#6b7280",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span>Cliente</span>
        <span>Email</span>
        {columns.map((col) => (
          <span
            key={col.header}
            style={{ textAlign: col.align === "right" ? "right" : "left" }}
          >
            {col.header}
          </span>
        ))}
        <span />
      </div>

      {pagedClients.map((client, index) => {
        const isSub = !!client.parentUsername;
        const isLastRow = index === pagedClients.length - 1;
        const key =
          getRowKey?.(client) ??
          `${client.id ?? client.email}-${client.username}`;

        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(client)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(client);
              }
            }}
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: 16,
              alignItems: "center",
              padding: "12px 20px",
              background: "#fff",
              borderBottom:
                !isLastRow || clients.length > pageSize
                  ? "1px solid #f0f1f3"
                  : "none",
              cursor: "pointer",
              transition: "background 0.12s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8f9fa";
              const accent = e.currentTarget.querySelector(
                "[data-row-accent]",
              ) as HTMLElement | null;
              if (accent) accent.style.opacity = "1";
              const chevron = e.currentTarget.querySelector(
                "[data-row-chevron]",
              ) as HTMLElement | null;
              if (chevron) chevron.style.color = "#ff6200";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              const accent = e.currentTarget.querySelector(
                "[data-row-accent]",
              ) as HTMLElement | null;
              if (accent) accent.style.opacity = "0";
              const chevron = e.currentTarget.querySelector(
                "[data-row-chevron]",
              ) as HTMLElement | null;
              if (chevron) chevron.style.color = "#d1d5db";
            }}
          >
            <span
              data-row-accent
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: "#ff6200",
                opacity: 0,
                transition: "opacity 0.12s ease",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isSub ? "#fff7ed" : "#f3f4f6",
                  border: isSub ? "1px solid #fed7aa" : "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isSub ? "#c2410c" : "#4b5563",
                  flexShrink: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {(client.username || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "#111827",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }}
                >
                  {client.username}
                </div>
                {isSub && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Subcuenta · {client.parentUsername}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {client.email}
            </div>

            {columns.map((col) => {
              const cellStyle: CSSProperties = {
                fontSize: 12,
                color: "#9ca3af",
                textAlign: col.align === "right" ? "right" : "left",
                fontVariantNumeric: "tabular-nums",
                minWidth: 0,
              };
              return (
                <div key={col.header} style={cellStyle}>
                  {col.render(client)}
                </div>
              );
            })}

            <svg
              data-row-chevron
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              style={{
                color: "#d1d5db",
                justifySelf: "end",
                transition: "color 0.12s ease",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        );
      })}

      {clients.length > pageSize && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 20px",
            background: "#fafbfc",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, clients.length)} de {clients.length}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                padding: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: safePage <= 1 ? "default" : "pointer",
                color: safePage <= 1 ? "#d1d5db" : "#4b5563",
                opacity: safePage <= 1 ? 0.6 : 1,
                fontFamily: font,
              }}
              aria-label="Página anterior"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#374151",
                minWidth: 64,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                padding: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: safePage >= totalPages ? "default" : "pointer",
                color: safePage >= totalPages ? "#d1d5db" : "#4b5563",
                opacity: safePage >= totalPages ? 0.6 : 1,
                fontFamily: font,
              }}
              aria-label="Página siguiente"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
