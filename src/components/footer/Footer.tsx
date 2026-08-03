// src/components/footer/Footer.tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Twitter, Instagram, Linkedin, Facebook } from "lucide-react";
import "./Footer.css";

type FooterLink = {
  labelKey: string;
  to: string;
  external?: boolean;
};

type FooterColumn = {
  titleKey: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    titleKey: "footer.columns.product.title",
    links: [
      { labelKey: "footer.columns.product.links.features", to: "/novedades" },
      { labelKey: "footer.columns.product.links.pricing", to: "/newquotes" },
      {
        labelKey: "footer.columns.product.links.integrations",
        to: "/contenedores",
      },
      {
        labelKey: "footer.columns.product.links.changelog",
        to: "/contactenos",
      },
      {
        labelKey: "footer.columns.product.links.reportError",
        to: "/reportar-error",
      },
    ],
  },
  {
    titleKey: "footer.columns.resources.title",
    links: [
      { labelKey: "footer.columns.resources.links.1", to: "/newquotes" },
      {
        labelKey: "footer.columns.resources.links.2",
        to: "/cotizacion-especial",
      },
      { labelKey: "footer.columns.resources.links.3", to: "/quotes" },
      { labelKey: "footer.columns.resources.links.4", to: "/itinerario" },
      { labelKey: "footer.columns.resources.links.5", to: "/trackings" },
      { labelKey: "footer.columns.resources.links.6", to: "/air-shipments" },
    ],
  },
  {
    titleKey: "footer.columns.company.title",
    links: [
      {
        labelKey: "footer.columns.company.links.about",
        to: "/promesas",
      },
      {
        labelKey: "footer.columns.company.links.careers",
        to: "https://www.seemanngroup.com/",
        external: true,
      },
      {
        labelKey: "footer.columns.company.links.contact",
        to: "/contactenos",
      },
      {
        labelKey: "footer.columns.company.links.partners",
        to: "https://www.seemanngroup.com/",
        external: true,
      },
    ],
  },
];

const SOCIALS = [
  { label: "X (Twitter)", href: "https://x.com/", Icon: Twitter },
  {
    label: "Instagram",
    href: "https://www.instagram.com/seemann_group/",
    Icon: Instagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/seemanngroup/",
    Icon: Linkedin,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/seemanngroup",
    Icon: Facebook,
  },
];

/** Enlaces públicos de la app móvil (App Store + Google Play). */
const STORE_BADGES = [
  {
    key: "app-store",
    href: "https://apps.apple.com/app/id6793726585",
    src: "/store/badge-app-store.svg",
    alt: "Download on the App Store",
    width: 120,
    height: 40,
  },
  {
    key: "google-play",
    href: "https://play.google.com/store/apps/details?id=com.seemanngroup.portalclientes",
    src: "/store/badge-google-play.png",
    alt: "Disponible en Google Play",
    width: 135,
    height: 52,
  },
] as const;

function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="sg-footer" role="contentinfo">
      <div className="sg-footer__top">
        <div className="sg-footer__brand">
          <div className="sg-footer__brand-row">
            <img
              src="/logo.png"
              alt="Seemann Group"
              className="sg-footer__logo"
              width={36}
              height={36}
              loading="lazy"
            />
            <span className="sg-footer__brand-name">Seemann Group</span>
          </div>
          <p className="sg-footer__tagline">{t("footer.tagline")}</p>

          <ul
            className="sg-footer__socials"
            aria-label={t("footer.socialsAriaLabel")}
          >
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="sg-footer__social-link"
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav
          className="sg-footer__cols"
          aria-label={t("footer.navigationAriaLabel")}
        >
          {COLUMNS.map((col) => {
            const isCompany = col.titleKey === "footer.columns.company.title";
            return (
              <div className="sg-footer__col" key={col.titleKey}>
                <h4 className="sg-footer__col-title">{t(col.titleKey)}</h4>
                <ul className="sg-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.labelKey}>
                      {link.external ? (
                        <a
                          href={link.to}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sg-footer__link"
                        >
                          {t(link.labelKey)}
                        </a>
                      ) : (
                        <Link to={link.to} className="sg-footer__link">
                          {t(link.labelKey)}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
                {isCompany ? (
                  <div className="sg-footer__apps">
                    <p className="sg-footer__apps-title">
                      {t("footer.appsTitle", {
                        defaultValue: "Apps de Seemann Group",
                      })}
                    </p>
                    <div
                      className="sg-footer__store-badges"
                      aria-label={t("footer.storeBadgesAriaLabel", {
                        defaultValue: "Descargar la aplicación",
                      })}
                    >
                      {STORE_BADGES.map((badge) => (
                        <a
                          key={badge.key}
                          href={badge.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`sg-footer__store-badge sg-footer__store-badge--${badge.key}`}
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
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="sg-footer__bottom">
        <p className="sg-footer__copy">{t("footer.copyright", { year })}</p>
        <ul className="sg-footer__legal">
          <li>
            <Link to="/privacy-policy" className="sg-footer__legal-link">
              {t("footer.legal.privacyPolicy")}
            </Link>
          </li>
          <li>
            <Link to="/terms-of-service" className="sg-footer__legal-link">
              {t("footer.legal.termsOfService")}
            </Link>
          </li>
          <li>
            <Link to="/cookie-settings" className="sg-footer__legal-link">
              {t("footer.legal.cookiesSettings")}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export default Footer;
