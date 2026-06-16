import { useState } from "react";
import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import ReactDOM from "react-dom/client";
import { PdfTemplateCountryRates } from "../../Pdftemplate/PdfTemplateCountryRates";
import {
  formatDateForFilename,
  generateFlattenedPDF,
  preloadLogoAsDataUrl,
} from "../../Pdftemplate/Pdfutils";
import {
  SERVICE_FILENAME_LABELS,
  SERVICE_SUFFIX_LABELS,
  type CountryRateColumn,
  type CountryRateRow,
  type CountryRateService,
} from "./countryRatesTypes";

interface CountryRatesDownloadButtonProps {
  service: CountryRateService;
  countryCode: string;
  countryLabel: string;
  destinationLabel?: string;
  destinationCode?: string;
  selectedOriginLabel?: string;
  columns: CountryRateColumn[];
  rows: CountryRateRow[];
  translationNs: "QuoteAIR" | "Quotefcl" | "Quotelcl";
  disabled?: boolean;
}

function formatGeneratedDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CountryRatesDownloadButton({
  service,
  countryCode,
  countryLabel,
  destinationLabel,
  destinationCode,
  selectedOriginLabel,
  columns,
  rows,
  translationNs,
  disabled = false,
}: CountryRatesDownloadButtonProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (generating || disabled || rows.length === 0) return;

    setGenerating(true);
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.top = "0";
    tempDiv.style.left = "0";
    tempDiv.style.width = "297mm";
    tempDiv.style.opacity = "0";
    tempDiv.style.pointerEvents = "none";
    tempDiv.style.zIndex = "-1";
    document.body.appendChild(tempDiv);

    try {
      const logoDataUrl = await preloadLogoAsDataUrl("/logo.png");
      const generatedDate = formatGeneratedDate(new Date());
      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        root.render(
          <PdfTemplateCountryRates
            countryLabel={countryLabel}
            serviceSuffix={SERVICE_SUFFIX_LABELS[service]}
            destinationLabel={destinationLabel}
            selectedOriginLabel={selectedOriginLabel}
            service={service}
            generatedDate={generatedDate}
            columns={columns}
            rows={rows}
            logoSrc={logoDataUrl}
          />,
        );
        setTimeout(resolve, 600);
      });

      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (!pdfElement) {
        throw new Error("PDF element not found");
      }

      const countryClean = countryCode.replace(/[^a-zA-Z0-9]/g, "_");
      const destinationClean = destinationCode
        ? `_${destinationCode.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
      const serviceLabel = SERVICE_FILENAME_LABELS[service];
      const filename = `Tarifas_${countryClean}${destinationClean}_${serviceLabel}_${formatDateForFilename(new Date())}.pdf`;

      await generateFlattenedPDF({
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
          ? t(`${translationNs}.downloadCountryRatesEmpty`)
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
          {t(`${translationNs}.downloadCountryRatesGenerating`)}
        </>
      ) : (
        <>
          <i className="bi bi-download me-1" aria-hidden />
          {t(`${translationNs}.downloadCountryRates`)}
        </>
      )}
    </Button>
  );
}
