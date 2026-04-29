// src/components/Footer/Footer.tsx
import { Link } from "react-router-dom";
import { Twitter, Instagram, Linkedin, Facebook } from "lucide-react";
import "./Footer.css";

type FooterLink = {
  label: string;
  to: string;
  external?: boolean;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/" },
      { label: "Pricing", to: "/" },
      { label: "Integrations", to: "/" },
      { label: "Changelog", to: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", to: "/" },
      { label: "Tutorials", to: "/" },
      { label: "Blog", to: "/" },
      { label: "Support", to: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Contact", to: "/" },
      { label: "Partners", to: "/" },
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

function Footer() {
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
          <p className="sg-footer__tagline">
            Líder en soluciones logísticas internacionales con más de 35 años de
            experiencia. Conectamos tu negocio con el mundo.
          </p>

          <ul className="sg-footer__socials" aria-label="Redes sociales">
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

        <nav className="sg-footer__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div className="sg-footer__col" key={col.title}>
              <h4 className="sg-footer__col-title">{col.title}</h4>
              <ul className="sg-footer__col-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sg-footer__link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to} className="sg-footer__link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="sg-footer__bottom">
        <p className="sg-footer__copy">
          © {year} Seemann Group. All rights reserved.
        </p>
        <ul className="sg-footer__legal">
          <li>
            <Link to="/" className="sg-footer__legal-link">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/" className="sg-footer__legal-link">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link to="/" className="sg-footer__legal-link">
              Cookies Settings
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export default Footer;
