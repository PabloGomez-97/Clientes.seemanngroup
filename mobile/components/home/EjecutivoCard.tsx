import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { imgUrl } from "../../config/images";
import SectionHeader from "../ui/SectionHeader";
import { brand, radii, spacing } from "../../theme/brand";

export default function EjecutivoCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ejecutivo = user?.ejecutivo;
  const [photoFailed, setPhotoFailed] = useState(false);

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
      <SectionHeader title={t("home.ejecutivo.title")} />
      <LinearGradient
        colors={["#ffffff", "#fff8f3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardInner}>
          <View style={styles.avatar}>
            {photo && !photoFailed ? (
              <Image
                source={{ uri: photo }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <LinearGradient
                colors={[brand.primary, brand.primaryDark]}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarInitials}>
                  {getInitials(ejecutivo.nombre)}
                </Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.name}>{ejecutivo.nombre}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.role}>{t("home.ejecutivo.role")}</Text>
            </View>
            {ejecutivo.email ? (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={14} color={brand.muted} />
                <Text style={styles.contact}>{ejecutivo.email}</Text>
              </View>
            ) : null}
            {ejecutivo.telefono ? (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={14} color={brand.muted} />
                <Text style={styles.contact}>{ejecutivo.telefono}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {ejecutivo.email ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => void Linking.openURL(`mailto:${ejecutivo.email}`)}
            >
              <Ionicons name="mail" size={16} color="#fff" />
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
              <Ionicons name="call" size={16} color={brand.primary} />
              <Text style={styles.secondaryButtonText}>
                {t("home.ejecutivo.call")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    padding: spacing.lg,
    shadowColor: brand.shadowOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  cardInner: {
    flexDirection: "row",
    gap: 16,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: brand.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginBottom: 10,
  },
  role: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.primary,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  contact: {
    fontSize: 13,
    color: brand.inkSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: radii.sm,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
  },
  secondaryButtonText: {
    color: brand.primary,
    fontWeight: "600",
    fontSize: 13,
  },
});
