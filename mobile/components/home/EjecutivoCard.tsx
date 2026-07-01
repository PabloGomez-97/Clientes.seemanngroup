import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { imgUrl } from "../../config/images";
import { LOGIN_DARK, LOGIN_PRIMARY } from "../../../src/auth/loginTheme";

export default function EjecutivoCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ejecutivo = user?.ejecutivo;

  if (!ejecutivo) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getEjecutivoImage = (nombre: string) => {
    const partes = nombre.trim().split(" ");
    if (partes.length < 2) return null;
    return imgUrl(
      `/ejecutivos/${partes[0][0].toLowerCase()}${partes[1][0].toLowerCase()}.png`,
    );
  };

  const photo = getEjecutivoImage(ejecutivo.nombre);
  const telHref = ejecutivo.telefono
    ? `tel:${ejecutivo.telefono.replace(/\s/g, "")}`
    : undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("home.ejecutivo.title")}</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>
              {getInitials(ejecutivo.nombre)}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{ejecutivo.nombre}</Text>
          <Text style={styles.role}>{t("home.ejecutivo.role")}</Text>
          {ejecutivo.email ? (
            <Text style={styles.contact}>{ejecutivo.email}</Text>
          ) : null}
          {ejecutivo.telefono ? (
            <Text style={styles.contact}>{ejecutivo.telefono}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {ejecutivo.email ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => void Linking.openURL(`mailto:${ejecutivo.email}`)}
            >
              <Ionicons name="mail-outline" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t("home.ejecutivo.sendMessage")}
              </Text>
            </Pressable>
          ) : null}
          {telHref ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void Linking.openURL(telHref)}
            >
              <Ionicons name="call-outline" size={16} color={LOGIN_DARK} />
              <Text style={styles.secondaryButtonText}>
                {t("home.ejecutivo.call")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: LOGIN_DARK,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ececec",
    padding: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
    color: LOGIN_PRIMARY,
  },
  info: {
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: LOGIN_DARK,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  contact: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
  },
  actions: {
    gap: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: LOGIN_PRIMARY,
    borderRadius: 4,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  secondaryButtonText: {
    color: LOGIN_DARK,
    fontWeight: "500",
    fontSize: 14,
  },
});
