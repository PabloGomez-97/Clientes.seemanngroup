import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { useHomeShipments } from "../../hooks/useHomeShipments";
import { useHomeDocumentsCount } from "../../hooks/useHomeDocumentsCount";
import { LOGIN_DARK, LOGIN_PRIMARY } from "../../../src/auth/loginTheme";

export default function WelcomeHeader() {
  const { t } = useTranslation();
  const { user, activeUsername } = useAuth();
  const { activeCount, loading: shipmentsLoading } =
    useHomeShipments(activeUsername);
  const { count: docsCount, loading: docsLoading } =
    useHomeDocumentsCount(activeUsername);

  const displayName =
    user?.nombreuser?.trim() || activeUsername || user?.username || "";

  const kpis = [
    {
      key: "shipments",
      label: t("home.welcome.kpiShipments"),
      value: activeCount,
      loading: shipmentsLoading,
    },
    {
      key: "documents",
      label: t("home.welcome.kpiDocuments"),
      value: docsCount,
      loading: docsLoading,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {t("home.welcome.greeting", { name: displayName })}
      </Text>
      {activeUsername ? (
        <Text style={styles.account}>
          {t("home.welcome.account", { account: activeUsername })}
        </Text>
      ) : null}

      <View style={styles.kpiRow}>
        {kpis.map((kpi) => (
          <Pressable key={kpi.key} style={styles.kpiCard}>
            {kpi.loading ? (
              <ActivityIndicator color={LOGIN_PRIMARY} size="small" />
            ) : (
              <Text style={styles.kpiValue}>{kpi.value}</Text>
            )}
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LOGIN_DARK,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 4,
  },
  account: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: 84,
    justifyContent: "center",
  },
  kpiValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  kpiLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    textAlign: "center",
  },
});
