import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { buildShipsGoEmbedUrl } from "../../../src/services/shipsgoTrackingLogic";
import { brand, radii } from "../../theme/brand";

type TrackingEmbedProps = {
  transport: "air" | "ocean";
  query: string;
  height?: number;
};

const EMBED_TOKEN = process.env.EXPO_PUBLIC_SHIPSGO_EMBED_TOKEN ?? "";

export default function TrackingEmbed({
  transport,
  query,
  height = 320,
}: TrackingEmbedProps) {
  const embedUrl = buildShipsGoEmbedUrl(EMBED_TOKEN, transport, query);

  if (!embedUrl) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Mapa no disponible para este seguimiento.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  placeholderText: {
    color: brand.muted,
    textAlign: "center",
    fontSize: 13,
  },
});
