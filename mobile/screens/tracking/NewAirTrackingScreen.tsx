import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ChipEditor from "../../components/tracking/ChipEditor";
import { useAuth } from "../../auth/AuthContext";
import {
  createAirShipment,
  fetchMobileTrackingEmailPreference,
  isValidTrackingEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  mergeTrackingEmails,
  saveMobileTrackingEmailPreference,
} from "../../services/shipsgoApi";
import { validateAwb } from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";

type NavigationProp = NativeStackNavigationProp<
  TrackeosStackParamList,
  "NewAirTracking"
>;

export default function NewAirTrackingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { token, activeUsername } = useAuth();
  const [awbNumber, setAwbNumber] = useState("");
  const [followers, setFollowers] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const awbValidation = validateAwb(awbNumber);

  useEffect(() => {
    if (!token || !activeUsername) return;
    void fetchMobileTrackingEmailPreference(token, activeUsername)
      .then((preference) => setSavedEmails(preference.emails))
      .catch(() => setSavedEmails([]));
  }, [token, activeUsername]);

  const handleSubmit = async () => {
    if (!token || !activeUsername) {
      setError("No hay sesión activa.");
      return;
    }
    if (!awbValidation.valid) {
      setError("El AWB debe tener exactamente 11 dígitos numéricos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanAwb = awbNumber.replace(/[\s-]/g, "");
      const shipment = await createAirShipment(token, {
        reference: activeUsername,
        awb_number: cleanAwb,
        followers,
        tags,
      });

      const merged = mergeTrackingEmails(savedEmails, followers);
      if (merged.added.length > 0) {
        await saveMobileTrackingEmailPreference(
          token,
          activeUsername,
          merged.emails,
        );
      }

      Alert.alert(
        "Seguimiento creado",
        `Tu envío aéreo ${shipment.awb_number} fue registrado correctamente.`,
        [
          {
            text: "Ver tracking",
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: "TrackeosList" },
                  { name: "AirDetail", params: { shipment } },
                ],
              });
            },
          },
        ],
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Error al crear el trackeo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Nuevo seguimiento aéreo</Text>
          <Text style={styles.subtitle}>
            Registra una guía aérea (AWB) para monitorear tu envío.
          </Text>

          <Text style={styles.label}>Cliente</Text>
          <TextInput
            value={activeUsername || ""}
            editable={false}
            style={[styles.input, styles.inputDisabled]}
          />

          <Text style={styles.label}>AWB Number *</Text>
          <TextInput
            value={awbNumber}
            onChangeText={setAwbNumber}
            placeholder="00000000000"
            keyboardType="number-pad"
            maxLength={12}
            style={[
              styles.input,
              awbNumber && !awbValidation.valid && styles.inputInvalid,
              awbNumber && awbValidation.valid && styles.inputValid,
            ]}
          />
          {awbNumber ? (
            <Text
              style={[
                styles.helper,
                awbValidation.valid ? styles.helperOk : styles.helperError,
              ]}
            >
              {awbValidation.message}
            </Text>
          ) : (
            <Text style={styles.helper}>
              Guía aérea de 11 dígitos proporcionada por la aerolínea
            </Text>
          )}

          <ChipEditor
            label="Etiquetas"
            placeholder="Escribe una etiqueta"
            values={tags}
            maxItems={10}
            onChange={setTags}
          />

          <ChipEditor
            label="Notificaciones"
            placeholder="correo@ejemplo.com"
            values={followers}
            maxItems={MAX_VISIBLE_TRACK_FOLLOWERS}
            onChange={setFollowers}
            keyboardType="email-address"
            validate={isValidTrackingEmail}
            suggestions={savedEmails}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("TrackeosList")}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                (!awbValidation.valid || loading) && styles.primaryButtonDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={!awbValidation.valid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Crear seguimiento</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: brand.muted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.inkSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: brand.ink,
    marginBottom: 8,
  },
  inputDisabled: {
    backgroundColor: brand.canvasAlt,
    color: brand.muted,
  },
  inputInvalid: {
    borderColor: "#dc2626",
  },
  inputValid: {
    borderColor: "#16a34a",
  },
  helper: {
    fontSize: 12,
    color: brand.muted,
    marginBottom: 16,
  },
  helperOk: {
    color: "#16a34a",
  },
  helperError: {
    color: "#dc2626",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: brand.surface,
  },
  secondaryButtonText: {
    color: brand.inkSecondary,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#ccc",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
