import { useTranslation } from "react-i18next";
import "./StoreDownloadBadges.css";

export const STORE_LINKS = {
  appStore: "https://apps.apple.com/app/id6793726585",
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.seemanngroup.portalclientes",
} as const;

const BADGES = [
  {
    key: "app-store",
    href: STORE_LINKS.appStore,
    src: "/store/badge-app-store.svg",
    alt: "Download on the App Store",
    width: 120,
    height: 40,
  },
  {
    key: "google-play",
    href: STORE_LINKS.googlePlay,
    src: "/store/badge-google-play.png",
    alt: "Disponible en Google Play",
    width: 135,
    height: 52,
  },
] as const;

type Variant = "footer" | "login";

type Props = {
  variant?: Variant;
  /** Si false, no muestra el título (útil si el padre ya lo tiene). */
  showTitle?: boolean;
  className?: string;
};

export default function StoreDownloadBadges({
  variant = "footer",
  showTitle = true,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const title =
    variant === "login"
      ? t("footer.appsLoginTitle", {
          defaultValue: "También disponible en la app",
        })
      : t("footer.appsTitle", {
          defaultValue: "Apps de Seemann Group",
        });

  return (
    <div
      className={`sg-store-badges sg-store-badges--${variant} ${className}`.trim()}
    >
      {showTitle ? <p className="sg-store-badges__title">{title}</p> : null}
      <div
        className="sg-store-badges__row"
        aria-label={t("footer.storeBadgesAriaLabel", {
          defaultValue: "Descargar la aplicación",
        })}
      >
        {BADGES.map((badge) => (
          <a
            key={badge.key}
            href={badge.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`sg-store-badges__link sg-store-badges__link--${badge.key}`}
          >
            <img
              src={badge.src}
              alt={badge.alt}
              width={badge.width}
              height={badge.height}
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
