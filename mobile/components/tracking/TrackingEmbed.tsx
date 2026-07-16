import { useMemo } from "react";
import {
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { buildShipsGoEmbedUrl } from "../../../src/services/shipsgoTrackingLogic";
import { PORTAL_BASE_URL } from "../../config/portal";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type TrackingEmbedProps = {
  transport: "air" | "ocean";
  query: string;
  height?: number;
};

const EMBED_TOKEN =
  process.env.EXPO_PUBLIC_SHIPSGO_EMBED_TOKEN?.trim() ||
  process.env.VITE_SHIPSGO_EMBED_TOKEN?.trim() ||
  "";

/** Carga el iframe con origen del portal (ya whitelisteado en ShipsGo). */
function buildPortalOriginHtml(embedUrl: string): string {
  const safeUrl = embedUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
      iframe { border: 0; width: 100%; height: 100%; display: block; }
    </style>
  </head>
  <body>
    <iframe
      src="${safeUrl}"
      title="Mapa de seguimiento ShipsGo"
      allowfullscreen
      allow="geolocation"
    ></iframe>
  </body>
</html>`;
}

export default function TrackingEmbed({
  transport,
  query,
  height = 320,
}: TrackingEmbedProps) {
  const embedUrl = useMemo(
    () => buildShipsGoEmbedUrl(EMBED_TOKEN, transport, query),
    [transport, query],
  );

  const htmlSource = useMemo(() => {
    if (!embedUrl) return null;
    return {
      html: buildPortalOriginHtml(embedUrl),
      baseUrl: `${PORTAL_BASE_URL}/`,
    };
  }, [embedUrl]);

  const onShare = async () => {
    if (!embedUrl) return;
    try {
      await Share.share({
        message: `Seguimiento Seemann Group\n${embedUrl}`,
        url: embedUrl,
        title: "Mapa de seguimiento",
      });
    } catch {
      // Usuario canceló o share no disponible.
    }
  };

  const onOpenExternal = () => {
    void Linking.openURL("https://portalclientes.seemanngroup.com/login");
  };

  if (!EMBED_TOKEN) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={28} color={brand.mutedLight} />
        <Text style={styles.placeholderTitle}>Mapa no configurado</Text>
        <Text style={styles.placeholderText}>
          Falta el token de embed de ShipsGo en la app
          (EXPO_PUBLIC_SHIPSGO_EMBED_TOKEN).
        </Text>
      </View>
    );
  }

  if (!query.trim()) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={28} color={brand.mutedLight} />
        <Text style={styles.placeholderTitle}>Mapa no disponible</Text>
        <Text style={styles.placeholderText}>
          Este seguimiento aún no tiene un identificador válido (AWB /
          contenedor / booking) para el mapa.
        </Text>
      </View>
    );
  }

  if (!embedUrl || !htmlSource) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Mapa no disponible para este seguimiento.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapa en vivo</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onOpenExternal}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityLabel="Abrir mapa"
          >
            <Ionicons name="open-outline" size={18} color={brand.navy} />
          </Pressable>
          <Pressable
            onPress={() => void onShare()}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityLabel="Compartir mapa"
          >
            <Ionicons name="share-outline" size={18} color={brand.primary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.wrap, { height }]}>
        <WebView
          source={htmlSource}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  placeholder: {
    minHeight: 140,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    textAlign: "center",
  },
  placeholderText: {
    color: brand.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
});
