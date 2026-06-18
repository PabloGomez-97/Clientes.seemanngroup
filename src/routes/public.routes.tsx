import { Route } from "react-router-dom";
import PrivacyPolicy from "@/components/footer/PrivacyPolicy";
import TermsOfService from "@/components/footer/TermsOfService";
import CookiesSettings from "@/components/footer/CookiesSettings";

export const publicRoutes = (
  <>
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-of-service" element={<TermsOfService />} />
    <Route path="/cookie-settings" element={<CookiesSettings />} />
  </>
);
