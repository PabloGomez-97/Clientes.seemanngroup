import { useState } from "react";
import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import ReactDOM from "react-dom/client";
import { PdfTemplateAirCountryRates } from "../../Pdftemplate/PdfTemplateAirCountryRates";
import {
  formatDateForFilename,
  generatePDF,
  preloadLogoAsDataUrl,
} from "../../Pdftemplate/Pdfutils";
import type { CountryAirRateRow } from "./buildCountryAirRates";

interface AirCountryRatesDownloadButtonProps {
  countryCode: string;
  countryLabel: string;
  rows: CountryAirRateRow[];
  disabled?: boolean;
}

function formatGeneratedDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AirCountryRatesDownloadButton({
  countryCode,
  countryLabel,
  rows,
  disabled = false,
}: AirCountryRatesDownloadButtonProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (generating || disabled || rows.length === 0) return;

    setGenerating(true);
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);

    try {
      const logoDataUrl = await preloadLogoAsDataUrl("/logo.png");
      const generatedDate = formatGeneratedDate(new Date());
      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        root.render(
          <PdfTemplateAirCountryRates
            countryLabel={countryLabel}
            generatedDate={generatedDate}
            rows={rows}
            logoSrc={logoDataUrl}
          />,
        );
        setTimeout(resolve, 400);
      });

      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (!pdfElement) {
        throw new Error("PDF element not found");
      }

      const countryClean = countryCode.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Tarifas_${countryClean}_${formatDateForFilename(new Date())}.pdf`;

      await generatePDF({
        filename,
        element: pdfElement,
        orientation: "landscape",
      });

      root.unmount();
    } catch (err) {
      console.error("Error al generar PDF de tarifas por país:", err);
    } finally {
      document.body.removeChild(tempDiv);
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline-secondary"
      size="sm"
      className="qa-btn qa-btn-outline qa-country-rates-download-btn"
      onClick={() => void handleDownload()}
      disabled={disabled || generating || rows.length === 0}
      title={
        rows.length === 0
          ? t("QuoteAIR.downloadCountryRatesEmpty")
          : undefined
      }
    >
      {generating ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden
          />
          {t("QuoteAIR.downloadCountryRatesGenerating")}
        </>
      ) : (
        <>
          <i className="bi bi-download me-1" aria-hidden />
          {t("QuoteAIR.downloadCountryRates")}
        </>
      )}
    </Button>
  );
}
