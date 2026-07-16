import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../auth/AuthContext";
import ScreenHeader from "../../components/ui/ScreenHeader";
import {
  getNotificationPreferences,
  registerPushToken,
  setNotificationPreferences,
  unregisterPushToken,
} from "../../services/pushNotifications";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export default function NotificacionesScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setEnabled(await getNotificationPreferences(token));
    } catch {
      setEnabled(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (next: boolean) => {
    if (!token || saving) return;
    setSaving(true);
    setEnabled(next);
    try {
      await setNotificationPreferences(token, next);
      if (next) {
        await registerPushToken(token);
      } else {
        await unregisterPushToken(token);
      }
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Notificaciones"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.label}>Notificaciones</Text>
            <Switch
              value={enabled}
              onValueChange={(v) => void onToggle(v)}
              disabled={saving}
              trackColor={{ false: brand.border, true: brand.primaryBorder }}
              thumbColor={enabled ? brand.primary : "#f4f3f4"}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: brand.ink,
  },
});
