import type { TenantOption } from "./authApi";

type Props = {
  tenants: TenantOption[];
  loading?: boolean;
  onSelect: (tenantId: "cl" | "mx") => void;
  onCancel: () => void;
};

const PRIMARY = "#ff6200";
const DARK = "#1a1a1a";

export default function TenantPicker({
  tenants,
  loading,
  onSelect,
  onCancel,
}: Props) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p
        style={{
          margin: 0,
          color: "#444",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        Tu cuenta tiene acceso a más de un país. Elige a cuál portal entrar:
      </p>
      {tenants.map((tenant) => (
        <button
          key={tenant.id}
          type="button"
          disabled={loading}
          onClick={() => onSelect(tenant.id)}
          style={{
            border: `1px solid ${PRIMARY}`,
            background: tenant.id === "mx" ? "#fff7f0" : DARK,
            color: tenant.id === "mx" ? DARK : "#fff",
            borderRadius: 10,
            padding: "14px 16px",
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? "wait" : "pointer",
            textAlign: "left",
          }}
        >
          {tenant.label}
          <span
            style={{
              display: "block",
              fontWeight: 400,
              fontSize: 12,
              opacity: 0.75,
              marginTop: 4,
            }}
          >
            {tenant.redirectTo}
          </span>
        </button>
      ))}
      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        style={{
          border: "none",
          background: "transparent",
          color: "#666",
          fontSize: 13,
          cursor: "pointer",
          padding: "8px 0",
        }}
      >
        Cancelar
      </button>
    </div>
  );
}
