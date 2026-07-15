import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import type { MenuStackParamList } from "../../navigation/MenuStack";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type LauncherItem =
  | {
      id: string;
      title: string;
      icon: keyof typeof Ionicons.glyphMap;
      accent: "navy" | "orange";
      kind: "tab";
      tab: keyof ClientTabParamList;
      screen?: string;
    }
  | {
      id: string;
      title: string;
      icon: keyof typeof Ionicons.glyphMap;
      accent: "navy" | "orange";
      kind: "menu";
      menu: keyof MenuStackParamList;
    };

const LAUNCHER: LauncherItem[] = [
  {
    id: "ops",
    title: "Operaciones",
    icon: "briefcase",
    accent: "navy",
    kind: "tab",
    tab: "Operaciones",
    screen: "OperacionesList",
  },
  {
    id: "quotes",
    title: "Cotizaciones",
    icon: "reader",
    accent: "navy",
    kind: "tab",
    tab: "Cotizaciones",
    screen: "CotizacionesList",
  },
  {
    id: "track",
    title: "Trackeos",
    icon: "navigate",
    accent: "orange",
    kind: "tab",
    tab: "Trackeos",
    screen: "TrackeosList",
  },
  {
    id: "docs",
    title: "Documentos",
    icon: "folder-open",
    accent: "orange",
    kind: "menu",
    menu: "MisDocumentos",
  },
  {
    id: "rates",
    title: "Tarifario",
    icon: "pricetag",
    accent: "navy",
    kind: "menu",
    menu: "Tarifario",
  },
  {
    id: "hist",
    title: "Histórico",
    icon: "pulse",
    accent: "navy",
    kind: "menu",
    menu: "HistoricoPrecios",
  },
];

const INDEX: {
  n: string;
  title: string;
  subtitle: string;
  menu: keyof MenuStackParamList;
}[] = [
  {
    n: "01",
    title: "Novedades",
    subtitle: "Comunicados y actualidad Seemann",
    menu: "Novedades",
  },
  {
    n: "02",
    title: "Nuestras promesas",
    subtitle: "Compromisos y modalidades de servicio",
    menu: "Promesas",
  },
  {
    n: "03",
    title: "Reportería financiera",
    subtitle: "Facturas y saldos de tu cuenta",
    menu: "ReporteriaFinanciera",
  },
  {
    n: "04",
    title: "Reportería operacional",
    subtitle: "Embarques y desempeño logístico",
    menu: "ReporteriaOperacional",
  },
];

export default function ConsultasGrid() {
  const navigation =
    useNavigation<BottomTabNavigationProp<ClientTabParamList>>();

  const openLauncher = (item: LauncherItem) => {
    if (item.kind === "tab") {
      // Nested tab screens vary by stack; cast keeps navigation flexible.
      (navigation.navigate as (name: string, params?: object) => void)(
        item.tab,
        item.screen ? { screen: item.screen } : undefined,
      );
      return;
    }
    (navigation.navigate as (name: string, params?: object) => void)("Menu", {
      screen: item.menu,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHead}>
        <Text style={styles.kicker}>Módulos</Text>
        <Text style={styles.title}>Accesos directos</Text>
      </View>

      <View style={styles.launcher}>
        {LAUNCHER.map((item) => {
          const orange = item.accent === "orange";
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.launchCell,
                pressed && styles.launchPressed,
              ]}
              onPress={() => openLauncher(item)}
            >
              <View
                style={[
                  styles.launchIcon,
                  orange ? styles.launchIconOrange : styles.launchIconNavy,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={orange ? brand.primary : brand.navy}
                />
              </View>
              <Text style={styles.launchLabel}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.kicker}>Consultas</Text>
        <Text style={styles.title}>Información y reportes</Text>
      </View>

      <View style={styles.indexList}>
        {INDEX.map((row, i) => (
          <Pressable
            key={row.n}
            style={({ pressed }) => [
              styles.indexRow,
              i < INDEX.length - 1 && styles.indexBorder,
              pressed && styles.indexPressed,
            ]}
            onPress={() =>
              (navigation.navigate as (name: string, params?: object) => void)(
                "Menu",
                { screen: row.menu },
              )
            }
          >
            <Text style={styles.indexNum}>{row.n}</Text>
            <View style={styles.indexCopy}>
              <Text style={styles.indexTitle}>{row.title}</Text>
              <Text style={styles.indexSub}>{row.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHead: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.primary,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.3,
  },
  launcher: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.xl + 4,
  },
  launchCell: {
    width: "31.5%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e9f0",
  },
  launchPressed: {
    borderColor: brand.primaryBorder,
    backgroundColor: brand.primarySoft,
  },
  launchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  launchIconNavy: {
    backgroundColor: "#eef2f7",
  },
  launchIconOrange: {
    backgroundColor: brand.primarySoft,
  },
  launchLabel: {
    fontSize: 11,
    textAlign: "center",
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  indexList: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e9f0",
    overflow: "hidden",
  },
  indexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  indexBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f5",
  },
  indexPressed: {
    backgroundColor: "#fafbfd",
  },
  indexNum: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: brand.primary,
    width: 28,
  },
  indexCopy: {
    flex: 1,
  },
  indexTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.navy,
  },
  indexSub: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
    lineHeight: 16,
  },
});
