import React from "react";
import { useTranslation } from "react-i18next";
import ItineraryFinder from "../../ItineraryFinder";

const HomeItinerarySection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="hm-itinerary-section"
      aria-label={t("home.itinerary.label")}
    >
      <h2 className="hm-section-title">{t("home.itinerary.label")}</h2>
      <div className="hm-itinerary-section__card">
        <ItineraryFinder />
      </div>
    </section>
  );
};

export default HomeItinerarySection;
