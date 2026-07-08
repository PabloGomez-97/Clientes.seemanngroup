import type { CSSProperties } from "react";
import { C, base } from "@/components/administrador/reporteria/financiera/executiveReportingUi";

export type AnalisysSectionId = "summary" | "trends" | "comparison" | "topCustomers";

export type AnalisysSectionDef = {
  id: AnalisysSectionId;
  label: string;
  description: string;
};

type Props = {
  sections: AnalisysSectionDef[];
  activeSection: AnalisysSectionId;
  onChange: (section: AnalisysSectionId) => void;
  layout?: "vertical" | "horizontal";
};

const itemBase: CSSProperties = {
  ...base,
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "14px 16px",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  backgroundColor: C.white,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

export default function AnalisysSectionNav({
  sections,
  activeSection,
  onChange,
  layout = "vertical",
}: Props) {
  return (
    <nav
      aria-label="Report sections"
      style={{
        display: "flex",
        flexDirection: layout === "horizontal" ? "row" : "column",
        gap: 10,
        flexWrap: layout === "horizontal" ? "wrap" : "nowrap",
        alignItems: "stretch",
      }}
    >
      {sections.map((section, index) => {
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            style={{
              ...itemBase,
              width: layout === "horizontal" ? "auto" : "100%",
              flex: layout === "horizontal" ? "1 1 240px" : undefined,
              borderColor: isActive ? C.primary : C.border,
              backgroundColor: isActive ? C.primaryLight : C.white,
              boxShadow:
                layout === "horizontal"
                  ? isActive
                    ? `inset 0 -3px 0 ${C.primary}`
                    : "none"
                  : isActive
                    ? `inset 3px 0 0 ${C.primary}`
                    : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  ...base,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isActive ? C.primary : C.borderLight,
                  color: isActive ? C.white : C.textMuted,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  ...base,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? C.secondary : C.text,
                }}
              >
                {section.label}
              </span>
            </div>
            <p
              style={{
                ...base,
                fontSize: 12,
                color: C.textMuted,
                margin: 0,
                lineHeight: 1.45,
                paddingLeft: 32,
              }}
            >
              {section.description}
            </p>
          </button>
        );
      })}
    </nav>
  );
}
