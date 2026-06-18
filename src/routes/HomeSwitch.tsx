import { useAuth } from "@/auth/AuthContext";
import HomeEjecutivo from "@/components/administrador/home/ejecutivo/HomeEjecutivo";
import HomeOperaciones from "@/components/administrador/home/operaciones/HomeOperaciones";
import HomePricing from "@/components/administrador/pricing/gestor/HomePricing";

/** Renders different home page depending on the user's role */
export default function HomeSwitch() {
  const { user } = useAuth();
  if (user?.roles?.pricing && !user?.roles?.ejecutivo) return <HomePricing />;
  if (user?.roles?.ejecutivo) return <HomeEjecutivo />;
  if (user?.roles?.operaciones) return <HomeOperaciones />;
  if (user?.roles?.pricing) return <HomePricing />;
  return <HomeEjecutivo />;
}
