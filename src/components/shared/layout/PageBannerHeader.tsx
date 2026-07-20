import { Trans, useTranslation } from "react-i18next";
import { imgUrl } from "@/config/images";
import "./PageBannerHeader.css";

export type PageBannerVariant =
  | "airShipments"
  | "oceanShipments"
  | "groundShipments"
  | "quotes"
  | "specialQuote"
  | "shippingOrder"
  | "airTracking"
  | "oceanTracking"
  | "myDocuments";

const UPPERCASE_BADGE_VARIANTS = new Set<PageBannerVariant>([
  "specialQuote",
  "shippingOrder",
  "airTracking",
  "oceanTracking",
  "myDocuments",
]);

const RICH_DESCRIPTION_VARIANTS = new Set<PageBannerVariant>([
  "airTracking",
  "oceanTracking",
]);

interface PageBannerHeaderProps {
  variant: PageBannerVariant;
  rounded?: boolean;
  className?: string;
}

export default function PageBannerHeader({
  variant,
  rounded = false,
  className,
}: PageBannerHeaderProps) {
  const { t } = useTranslation();
  const baseKey = `pageBanner.${variant}`;
  const badge = t(`${baseKey}.badge`);
  const title = t(`${baseKey}.title`);
  const isUppercaseBadge = UPPERCASE_BADGE_VARIANTS.has(variant);
  const hasRichDescription = RICH_DESCRIPTION_VARIANTS.has(variant);

  return (
    <div
      className={`pbh${rounded ? " pbh--rounded" : ""}${className ? ` ${className}` : ""}`}
    >
      <img
        className="pbh__img"
        src={imgUrl("/insights1.png")}
        alt=""
        aria-hidden
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="pbh__overlay">
        <div>
          <div
            className={`pbh__badge${isUppercaseBadge ? " pbh__badge--caps" : ""}`}
          >
            {badge}
          </div>
          <h2 className="pbh__title">{title}</h2>
          <div className="pbh__desc">
            {hasRichDescription ? (
              <Trans
                i18nKey={`${baseKey}.description`}
                components={{
                  p: <p />,
                  strong: <strong />,
                  highlight: <strong className="pbh__highlight" />,
                }}
              />
            ) : (
              <p>{t(`${baseKey}.description`)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
