import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { AlertCircle, Mail } from "lucide-react";
import InfoPageShell from "./InfoPageShell";

const REPORT_EMAIL = "pablo@sphereglobal.io";

const ReportarError: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const mailSubject = encodeURIComponent(t("reportarError.mailSubject"));
  const mailBody = encodeURIComponent(
    `${t("reportarError.mailBodyIntro")}\n\n` +
      `${t("reportarError.mailBodyUrl")}: ${window.location.origin}${location.pathname}\n` +
      `${t("reportarError.mailBodyDescribe")}:\n\n`,
  );
  const mailtoHref = `mailto:${REPORT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <InfoPageShell
      title={t("reportarError.title")}
      subtitle={t("reportarError.subtitle")}
    >
      <div className="info-report">
        <div className="info-report__icon" aria-hidden>
          <AlertCircle size={32} strokeWidth={1.5} />
        </div>

        <p className="info-report__text">{t("reportarError.description")}</p>

        <ul className="info-report__tips">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`reportarError.tips.item${n}`)}</li>
          ))}
        </ul>

        <a href={mailtoHref} className="info-report__btn">
          <Mail size={18} strokeWidth={1.75} aria-hidden />
          {t("reportarError.sendEmail")}
        </a>

        <p className="info-report__email">
          {t("reportarError.directTo")}{" "}
          <a href={mailtoHref}>{REPORT_EMAIL}</a>
        </p>
      </div>
    </InfoPageShell>
  );
};

export default ReportarError;
