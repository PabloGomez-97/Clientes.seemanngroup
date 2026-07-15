import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { imgUrl } from "../../config/images";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

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
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <Text style={styles.kicker}>{t("home.ejecutivo.title")}</Text>

      <View style={styles.row}>
        <View style={styles.avatar}>
          {photo && !photoFailed ? (
            <Image
              source={{ uri: photo }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <Text style={styles.initials}>{getInitials(ejecutivo.nombre)}</Text>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {ejecutivo.nombre}
          </Text>
          <Text style={styles.role}>{t("home.ejecutivo.role")}</Text>
          {ejecutivo.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {ejecutivo.email}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {ejecutivo.email ? (
          <Pressable
            style={styles.btnPrimary}
            onPress={() => void Linking.openURL(`mailto:${ejecutivo.email}`)}
          >
            <Ionicons name="mail-outline" size={15} color="#fff" />
            <Text style={styles.btnPrimaryText}>Escribir</Text>
          </Pressable>
        ) : null}
        {telHref ? (
          <Pressable
            style={styles.btnGhost}
            onPress={() => void Linking.openURL(telHref)}
          >
            <Ionicons name="call-outline" size={15} color={brand.navy} />
            <Text style={styles.btnGhostText}>Llamar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rule: {
    height: 1,
    backgroundColor: "#dde3eb",
    marginBottom: spacing.md,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.primary,
    fontFamily: fonts.semiBold,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: brand.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 52,
    height: 52,
  },
  initials: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: brand.navy,
  },
  role: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
  },
  email: {
    marginTop: 2,
    fontSize: 12,
    color: brand.inkSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: brand.navy,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  btnGhost: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d5dde8",
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnGhostText: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
});
