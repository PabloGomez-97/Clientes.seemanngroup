import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import type { CotizadorStackParamList } from "../../navigation/CotizadorStack";
import { useStaffClientsSource } from "../../navigation/StaffClientsSourceContext";
import ClientsListScreen from "../executive/ClientsListScreen";
import type { Cliente } from "../../services/ejecutivoClientesApi";

type Nav = NativeStackNavigationProp<
  CotizadorStackParamList,
  "CotizadorClientPicker"
>;

export default function CotizadorClientPickerScreen() {
  const navigation = useNavigation<Nav>();
  const { setActiveUsername } = useAuth();
  const source = useStaffClientsSource();

  const onSelect = (client: Cliente) => {
    void setActiveUsername(client.username);
    navigation.navigate("CotizadorHub", {
      clientUsername: client.username,
      clientName: client.nombreuser || client.username,
    });
  };

  return (
    <ClientsListScreen
      title="Cotizador"
      subtitle={
        source === "global"
          ? "Seleccioná el cliente antes de cotizar"
          : "Seleccioná un cliente de tu cartera"
      }
      onSelectClient={onSelect}
      onBack={() => navigation.getParent()?.goBack() ?? navigation.goBack()}
    />
  );
}
