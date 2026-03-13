import { useAuth } from "../../auth/AuthContext";
import TrackingEmailSettings from "./TrackingEmailSettings";

function Settings() {
  const { user, activeUsername } = useAuth();

  return (
    <TrackingEmailSettings
      reference={activeUsername}
      username={user?.nombreuser || user?.username || "Usuario"}
      email={user?.email || ""}
    />
  );
}

export default Settings;
