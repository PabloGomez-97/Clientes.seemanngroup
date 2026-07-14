import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  C,
  base,
  btnOutline,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number | string;
};

export default function AnalisysSimpleModal({
  title,
  description,
  onClose,
  children,
  maxWidth = 640,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(17, 24, 39, 0.45)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: `min(${typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth}, 100%)`,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.white,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ ...base, fontSize: 18, fontWeight: 700, color: C.secondary }}>
              {title}
            </div>
            {description && (
              <div style={{ ...base, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                {description}
              </div>
            )}
          </div>
          <button type="button" style={btnOutline} onClick={onClose}>
            {t("analisysSystem.modal.close")}
          </button>
        </div>
        <div style={{ padding: 20, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
